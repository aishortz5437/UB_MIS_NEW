import { useEffect, useState, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Building2, FlaskConical, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';



// --- Optimized Sub-Component to prevent focus loss ---
const PositionCard = memo(({ 
  position, 
  value, 
  onChange, 
  color = "slate" 
}: { 
  position: any, 
  value: string, 
  onChange: (id: string, val: string) => void,
  color?: string 
}) => {
  return (
    <div className={cn(
      "relative flex flex-col items-center rounded-xl border-2 bg-card p-2 shadow-sm w-32 transition-all group z-10",
      value ? "border-primary/40 bg-primary/5" : "border-dashed border-muted-foreground/30"
    )}>
      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">
        {position.position_name}
      </span>
      <Input 
        value={value} 
        onChange={(e) => onChange(position.id, e.target.value)}
        placeholder="..."
        className="h-6 text-[10px] font-bold text-center bg-transparent border-none shadow-none focus-visible:ring-0 p-0"
      />
      {/* Updated Connection Joint: Darker and more visible */}
      <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-400 border border-background shadow-sm" />
    </div>
  );
});

PositionCard.displayName = 'PositionCard';

export default function Hierarchy() {
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manualNames, setManualNames] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Defined a constant for the line styling to keep it consistent
  const lineStyle = "bg-slate-300 dark:bg-slate-600";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data } = await supabase
      .from('org_hierarchy')
      .select('*')
      .order('position_order');

    if (data) {
    // Cast the data to 'any' or a custom interface to bypass the error temporarily
    const hierarchyData = data as any[]; 
    setHierarchy(hierarchyData);
    
    const names: Record<string, string> = {};
    hierarchyData.forEach((h) => {
      // Now TypeScript won't complain about person_name
      names[h.id] = h.person_name || ''; 
    });
    setManualNames(names);
  }
  setLoading(false);
}

  

  const handleNameChange = (id: string, value: string) => {
    setManualNames((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const id in manualNames) {
        await supabase
          .from('org_hierarchy')
          .update({ person_name: manualNames[id] })
          .eq('id', id);
      }
      toast({ title: 'Hierarchy saved successfully' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  

  const director = hierarchy.find(h => h.position_name === 'Director');
  const adAdmin = hierarchy.find(h => h.position_name === 'AD Admin');
  const adFinance = hierarchy.find(h => h.position_name === 'AD Finance');
  
  const consultancyNodes = hierarchy.filter(h => ['EnS', 'RnB', 'Arch', 'Allied'].includes(h.position_name));
  const peripheralNodes = hierarchy.filter(h => ['Lab', 'Quest', 'Vaastu', 'Realty'].includes(h.position_name));

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <AppLayout>
      <div className="page-shell space-y-12 pb-20 overflow-x-auto">
        <div className="flex items-center justify-between border-b pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Organization Hierarchy</h1>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save All Names'}
          </Button>
        </div>

        <div className="flex flex-col items-center pt-8 min-w-[1200px]">
          {/* LEVEL 1: DIRECTOR */}
          {director && (
            <div className="relative mb-12">
              <PositionCard position={director} value={manualNames[director.id]} onChange={handleNameChange} color="primary" />
              {/* Darker Vertical Line */}
              <div className={cn("absolute top-full left-1/2 w-0.5 h-12 -translate-x-1/2", lineStyle)} />
            </div>
          )}

          {/* LEVEL 2: STAFF ADs */}
          <div className="relative w-full flex justify-between max-w-[600px] mb-12">
            {/* Darker Horizontal Line */}
            <div className={cn("absolute top-0 left-0 right-0 h-0.5", lineStyle)} />
            
            <div className="relative pt-6">
                <div className={cn("absolute top-0 left-1/2 w-0.5 h-6 -translate-x-1/2", lineStyle)} />
                {adAdmin && <PositionCard position={adAdmin} value={manualNames[adAdmin.id]} onChange={handleNameChange} />}
            </div>
            
            <div className="relative pt-6">
                <div className={cn("absolute top-0 left-1/2 w-0.5 h-6 -translate-x-1/2", lineStyle)} />
                {adFinance && <PositionCard position={adFinance} value={manualNames[adFinance.id]} onChange={handleNameChange} />}
            </div>
            
            {/* Main Trunk Line */}
            <div className={cn("absolute top-0 left-1/2 w-0.5 h-[calc(100%+48px)] -translate-x-1/2 -z-10", lineStyle)} />
          </div>

          {/* LEVEL 3: SIDE BY SIDE VERTICALS */}
          <div className="relative w-full">
            {/* Main Connecting Bridge */}
            <div className={cn("absolute top-0 left-[12%] right-[12%] h-0.5", lineStyle)} />
            
            <div className="flex justify-between gap-12 pt-6">
              
              {/* Consultancy Column */}
              <div className="flex-1 flex flex-col items-center relative">
                <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 h-6 w-0.5", lineStyle)} />
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 mb-8 z-10">
                  <Building2 className="h-3 w-3 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Consultancy</span>
                </div>
                
                <div className="relative flex gap-3">
                    <div className={cn("absolute top-0 left-[10%] right-[10%] h-0.5 opacity-70", lineStyle)} />
                    {consultancyNodes.map(node => (
                      <div key={node.id} className="relative pt-4">
                        <div className={cn("absolute top-0 left-1/2 w-0.5 h-4 -translate-x-1/2 opacity-70", lineStyle)} />
                        <PositionCard position={node} value={manualNames[node.id]} onChange={handleNameChange} color="primary" />
                      </div>
                    ))}
                </div>
              </div>

              {/* Peripherals Column */}
              <div className="flex-1 flex flex-col items-center relative">
                <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 h-6 w-0.5", lineStyle)} />
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-8 z-10">
                  <FlaskConical className="h-3 w-3 text-emerald-600" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Peripherals</span>
                </div>

                <div className="relative flex gap-3">
                    <div className={cn("absolute top-0 left-[10%] right-[10%] h-0.5 opacity-70", lineStyle)} />
                    {peripheralNodes.map(node => (
                      <div key={node.id} className="relative pt-4">
                        <div className={cn("absolute top-0 left-1/2 w-0.5 h-4 -translate-x-1/2 opacity-70", lineStyle)} />
                        <PositionCard position={node} value={manualNames[node.id]} onChange={handleNameChange} color="emerald" />
                      </div>
                    ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </AppLayout>

    
  );
}
