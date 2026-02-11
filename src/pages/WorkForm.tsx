import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Division, WorkStatus } from '@/types/database';

const statuses: WorkStatus[] = ['Pipeline', 'Running', 'Review', 'Completed'];

export default function WorkForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [formData, setFormData] = useState({
    ubqn: '',
    work_name: '',
    client_name: '',
    division_id: '',
    subcategory: '', 
    status: 'Pipeline' as WorkStatus,
    consultancy_cost: '',
    // Synced with existing DB columns
    order_no: '',   
    order_date: '',
    forwarding_letter: '',
    invoice_no: '',
  });

  const selectedDivision = divisions.find(d => d.id === formData.division_id);
  const isRnB = selectedDivision?.code === 'RnB';

  useEffect(() => {
    async function fetchData() {
      const { data: divisionsRes } = await supabase.from('divisions').select('*');
      if (divisionsRes) setDivisions(divisionsRes);

      if (id) {
        const { data: work } = await (supabase as any)
          .from('works')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (work) {
          setFormData({
            ubqn: work.ubqn || '',
            work_name: work.work_name || '',
            client_name: work.client_name || '',
            division_id: work.division_id || '',
            subcategory: work.subcategory || '',
            status: work.status || 'Pipeline',
            consultancy_cost: String(work.consultancy_cost || 0),
            order_no: work.order_no || '', 
            order_date: work.order_date ? work.order_date.split('T')[0] : '',
            forwarding_letter: work.forwarding_letter || '',
            invoice_no: work.invoice_no || '',
          });
        }
      }
    }
    fetchData();
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRnB && !formData.subcategory) {
      toast({
        title: "Selection Required",
        description: "Please select either Road or Bridge for the RnB division.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const workData = {
        ubqn: formData.ubqn.trim(),
        work_name: formData.work_name.trim(),
        client_name: formData.client_name.trim() || null,
        division_id: formData.division_id,
        subcategory: isRnB ? formData.subcategory : null,
        status: formData.status,
        consultancy_cost: parseFloat(formData.consultancy_cost) || 0,
        updated_at: new Date().toISOString(),
        // Mapping state to correct DB column names
        order_no: formData.status === 'Running' ? formData.order_no.trim() : null,
        order_date: formData.status === 'Running' ? formData.order_date : null,
        forwarding_letter: formData.status === 'Completed' ? formData.forwarding_letter.trim() || null : null,
        invoice_no: formData.status === 'Completed' ? formData.invoice_no.trim() || null : null,
      };

      const db = supabase as any;

      if (isEdit) {
        const { error } = await db.from('works').update(workData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await db.from('works').insert(workData);
        if (error) throw error;
      }

      toast({
        title: isEdit ? 'Work updated' : 'Work created',
        description: `${formData.work_name} saved successfully.`,
      });

      navigate('/works');
    } catch (error: any) {
      toast({
        title: 'Error Saving Work',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            to="/works"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Works
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {isEdit ? 'Edit Work Entry' : 'Add New Work'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-6 sm:grid-cols-2">
              
              <div className="space-y-2">
                <Label htmlFor="ubqn" className="font-bold">UBQN *</Label>
                <Input
                  id="ubqn"
                  value={formData.ubqn}
                  onChange={(e) => handleChange('ubqn', e.target.value)}
                  required
                  placeholder="e.g., 101"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="division_id" className="font-bold">Division *</Label>
                <Select
                  value={formData.division_id}
                  onValueChange={(v) => {
                    handleChange('division_id', v);
                    handleChange('subcategory', '');
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isRnB && (
                <div className="space-y-3 sm:col-span-2 p-4 rounded-lg bg-blue-50/50 border border-blue-100 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    RnB Sub-Type Selection *
                  </Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={formData.subcategory === 'Road' ? 'default' : 'outline'}
                      className={cn(
                        "flex-1 font-bold h-10",
                        formData.subcategory === 'Road' && "bg-blue-600 hover:bg-blue-700"
                      )}
                      onClick={() => handleChange('subcategory', 'Road')}
                    >
                      Road
                    </Button>
                    <Button
                      type="button"
                      variant={formData.subcategory === 'Bridge' ? 'default' : 'outline'}
                      className={cn(
                        "flex-1 font-bold h-10",
                        formData.subcategory === 'Bridge' && "bg-cyan-600 hover:bg-cyan-700 text-white"
                      )}
                      onClick={() => handleChange('subcategory', 'Bridge')}
                    >
                      Bridge
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="work_name" className="font-bold">Work Name / Particulars *</Label>
                <Input
                  id="work_name"
                  value={formData.work_name}
                  onChange={(e) => handleChange('work_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_name" className="font-bold">Client Name (Shorthand) *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => handleChange('client_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consultancy_cost" className="font-bold">Consultancy Cost (₹) *</Label>
                <Input
                  id="consultancy_cost"
                  type="number"
                  step="0.01"
                  value={formData.consultancy_cost}
                  onChange={(e) => handleChange('consultancy_cost', e.target.value)}
                  required
                  className="font-mono font-bold text-blue-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="font-bold">Project Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => handleChange('status', v as WorkStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Fields using order_no and order_date */}
              {formData.status === 'Running' && (
                <div className="sm:col-span-2 grid gap-6 sm:grid-cols-2 p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 animate-in fade-in zoom-in-95 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="order_no" className="text-emerald-700 font-bold">Work Order No. *</Label>
                    <Input
                      id="order_no"
                      value={formData.order_no}
                      onChange={(e) => handleChange('order_no', e.target.value)}
                      required={formData.status === 'Running'}
                      placeholder="Enter order reference"
                      className="border-emerald-200 focus-visible:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order_date" className="text-emerald-700 font-bold">Order Date *</Label>
                    <Input
                      id="order_date"
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => handleChange('order_date', e.target.value)}
                      required={formData.status === 'Running'}
                      className="border-emerald-200 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {formData.status === 'Completed' && (
                <div className="sm:col-span-2 grid gap-6 sm:grid-cols-2 p-4 rounded-lg bg-indigo-50/60 border border-indigo-100 animate-in fade-in zoom-in-95 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="forwarding_letter" className="text-indigo-700 font-bold">
                      Forwarding Letter
                    </Label>
                    <Input
                      id="forwarding_letter"
                      value={formData.forwarding_letter}
                      onChange={(e) => handleChange('forwarding_letter', e.target.value)}
                      placeholder="Enter forwarding letter ref"
                      className="border-indigo-200 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_no" className="text-indigo-700 font-bold">
                      Invoice
                    </Label>
                    <Input
                      id="invoice_no"
                      value={formData.invoice_no}
                      onChange={(e) => handleChange('invoice_no', e.target.value)}
                      placeholder="Enter invoice reference"
                      className="border-indigo-200 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link to="/works">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading} className="px-10 bg-slate-900">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEdit ? 'Update Work Record' : 'Create Work Entry')}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
