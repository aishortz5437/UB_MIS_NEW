import { useEffect, useState, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Building2, FlaskConical, Save, Loader2, User, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

// --- Types ---
interface OrgPosition {
  id: string;
  position_name: string;
  person_name: string | null;
  position_order: number;
}

// --- Components ---

const Connector = ({ className }: { className?: string }) => (
  <div className={cn("w-px bg-border h-8 mx-auto", className)} />
);

const OrgCard = memo(({
  position,
  value,
  onChange,
  variant = "default",
  icon: Icon,
  readOnly = false
}: {
  position: OrgPosition,
  value: string,
  onChange: (id: string, val: string) => void,
  variant?: "director" | "admin" | "consultancy" | "peripheral" | "default",
  icon?: any,
  readOnly?: boolean
}) => {
  const variants = {
    director: "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10",
    admin: "border-blue-400/30 bg-blue-50/50 dark:bg-blue-900/10",
    consultancy: "border-indigo-400/30 bg-indigo-50/50 dark:bg-indigo-900/10",
    peripheral: "border-emerald-400/30 bg-emerald-50/50 dark:bg-emerald-900/10",
    default: "border-border bg-card"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 w-[180px] backdrop-blur-sm transition-all hover:shadow-md",
        variants[variant]
      )}
    >
      {/* Position Label */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
        {Icon && <Icon className="w-3 h-3" />}
        <span>{position.position_name}</span>
      </div>

      {/* Input Field */}
      <div className="relative w-full">
        <Input
          value={value}
          onChange={(e) => onChange(position.id, e.target.value)}
          placeholder={readOnly ? "Vacant" : "Enter Name..."}
          disabled={readOnly}
          className={cn(
            "h-8 text-center font-medium bg-background/50 border-input/50 focus-visible:ring-1 focus-visible:ring-primary/50 text-sm",
            readOnly && "cursor-default opacity-90 border-transparent bg-transparent shadow-none"
          )}
        />
      </div>

      {/* Decorative Status Dot */}
      <div className={cn(
        "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background",
        value ? "bg-green-500" : "bg-slate-300"
      )} />

      {/* Connector Nodes for visual linking */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-border" />
    </motion.div>
  );
});

OrgCard.displayName = 'OrgCard';

export default function Hierarchy() {
  const [hierarchy, setHierarchy] = useState<OrgPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manualNames, setManualNames] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data, error } = await supabase
      .from('org_hierarchy')
      .select('*')
      .order('position_order');

    if (error) {
      toast({ title: 'Error loading hierarchy', variant: 'destructive' });
      return;
    }

    if (data) {
      setHierarchy(data as unknown as OrgPosition[]);

      const names: Record<string, string> = {};
      data.forEach((h: any) => {
        names[h.id] = h.person_name || '';
      });
      setManualNames(names);
    }
    setLoading(false);
  }

  // --- Role Check ---
  const { role } = useAuth();
  const isDirector = role === 'Director';

  const handleNameChange = (id: string, value: string) => {
    if (!isDirector) return;
    setManualNames((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (!isDirector) return;
    setSaving(true);
    // ... existing save logic ...
    try {
      for (const id in manualNames) {
        await supabase
          .from('org_hierarchy')
          .update({ person_name: manualNames[id] } as any)
          .eq('id', id);
      }
      toast({ title: 'Hierarchy saved successfully', className: "bg-green-500 text-white border-none" });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // --- Node Selectors ---
  const director = hierarchy.find(h => h.position_name === 'Director');
  const adAdmin = hierarchy.find(h => h.position_name === 'AD Admin');
  const adFinance = hierarchy.find(h => h.position_name === 'AD Finance');

  const consultancyNodes = hierarchy.filter(h => ['EnS', 'RnB', 'Arch', 'Allied'].includes(h.position_name));
  const peripheralNodes = hierarchy.filter(h => ['Lab', 'Quest', 'Vaastu', 'Realty'].includes(h.position_name));

  if (loading) return (
    <AppLayout>
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
        <p className="text-muted-foreground animate-pulse">Loading Organization Structure...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 pb-20">

        {/* Header Section */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              Organization Hierarchy
            </h1>
            <p className="text-sm text-muted-foreground">Manage roles and reporting structure</p>
          </div>

          {/* Only Show Save Button to Directors */}
          {isDirector && (
            <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-lg hover:shadow-xl transition-all">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving Changes...' : 'Save Structure'}
            </Button>
          )}
        </div>

        {/* Tree Layout Container */}
        <div className="p-12 overflow-x-auto">
          <div className="min-w-[1000px] flex flex-col items-center">

            {/* --- Level 1: Director --- */}
            {director && (
              <div className="flex flex-col items-center z-20">
                <OrgCard
                  position={director}
                  value={manualNames[director.id]}
                  onChange={handleNameChange}
                  variant="director"
                  icon={User}
                  readOnly={!isDirector}
                />
                <Connector className="h-12" />
              </div>
            )}

            {/* --- Level 2: ADs --- */}
            <div className="flex flex-col items-center w-full z-10">

              {/* Horizontal Bridge for ADs */}
              <div className="relative w-[400px] border-t border-border h-8">
                {/* Vertical Lines from Bridge down to ADs */}
                <div className="absolute left-0 top-0 w-px h-8 bg-border -translate-x-1/2" />
                <div className="absolute right-0 top-0 w-px h-8 bg-border translate-x-1/2" />

                {/* Middle connector from Director */}
                <div className="absolute left-1/2 -top-4 w-px h-4 bg-border -translate-x-1/2" />
              </div>

              <div className="flex gap-[220px]"> {/* Gap matches spacing for bridge */}

                {/* AD Admin Branch */}
                <div className="flex flex-col items-center">
                  {adAdmin && (
                    <OrgCard
                      position={adAdmin}
                      value={manualNames[adAdmin.id]}
                      onChange={handleNameChange}
                      variant="admin"
                      readOnly={!isDirector}
                    />
                  )}
                  {/* Long vertical line to next section if needed, or specific spacing */}
                  <Connector className="h-16" />
                </div>

                {/* AD Finance Branch */}
                <div className="flex flex-col items-center">
                  {adFinance && (
                    <OrgCard
                      position={adFinance}
                      value={manualNames[adFinance.id]}
                      onChange={handleNameChange}
                      variant="admin"
                      readOnly={!isDirector}
                    />
                  )}
                  <Connector className="h-16" />
                </div>
              </div>
            </div>

            {/* --- Level 3: Departments --- */}
            {/* Large horizontal bridge to split the two main operational groups */}
            <div className="relative w-[70%] border-t border-border mt-[-1px]">
              {/* Connectors up to ADs */}
              {/* We need to align these visually with the ADs above.
                   Since ADs are centered in a gap of 220px, let's use a wide flexible container instead of strict pixels.
               */}
            </div>

            {/* Let's use a tailored grid for the bottom section to ensure alignment */}
            <div className="grid grid-cols-2 gap-24 w-full max-w-5xl mt-[-1px]">

              {/* Left Column: Consultancy (Reporting to AD Admin/Ops normally, but structurally laid out here) */}
              <div className="flex flex-col items-center">
                {/* Connection Line Up */}
                <div className="h-8 w-px bg-border mb-4 relative">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-border" />
                </div>

                <Badge variant="outline" className="mb-6 px-4 py-1.5 border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-bold uppercase tracking-widest shadow-sm">
                  Consultancy Wings
                </Badge>

                <div className="grid grid-cols-2 gap-x-8 gap-y-12">
                  {consultancyNodes.map((node, i) => (
                    <div key={node.id} className="relative flex flex-col items-center group">
                      {/* Horizontal branch line if needed, or just individual vertical stems */}
                      <div className="absolute -top-12 left-1/2 w-px h-12 bg-border/50 group-first:h-12" />
                      {/* We need a better way to connect these grids. A horizontal bar for the group is best. */}

                      <OrgCard
                        position={node}
                        value={manualNames[node.id]}
                        onChange={handleNameChange}
                        variant="consultancy"
                        readOnly={!isDirector}
                      />
                    </div>
                  ))}
                </div>

                {/* Horizontal Bar for Consultancy Group */}
                {consultancyNodes.length > 0 && (
                  <div className="absolute mt-[88px] w-[300px] border-t border-border/50 -z-10" />
                )}
              </div>


              {/* Right Column: Peripherals */}
              <div className="flex flex-col items-center">
                {/* Connection Line Up */}
                <div className="h-8 w-px bg-border mb-4 relative">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-border" />
                </div>

                <Badge variant="outline" className="mb-6 px-4 py-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-bold uppercase tracking-widest shadow-sm">
                  Peripherals
                </Badge>

                <div className="grid grid-cols-2 gap-x-8 gap-y-12">
                  {peripheralNodes.map((node) => (
                    <div key={node.id} className="relative flex flex-col items-center">
                      <div className="absolute -top-12 left-1/2 w-px h-12 bg-border/50" />
                      <OrgCard
                        position={node}
                        value={manualNames[node.id]}
                        onChange={handleNameChange}
                        variant="peripheral"
                        icon={FlaskConical}
                        readOnly={!isDirector}
                      />
                    </div>
                  ))}
                </div>

                {/* Horizontal Bar for Peripherals Group */}
                {peripheralNodes.length > 0 && (
                  <div className="absolute mt-[88px] w-[300px] border-t border-border/50 -z-10" />
                )}
              </div>

            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
