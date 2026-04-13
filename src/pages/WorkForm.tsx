import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
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
import { useAuth } from '@/hooks/useAuth';
import { notifyDirectors } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { getUserFriendlyErrorMessage } from '@/lib/error-mapping';
import type { Division, WorkStatus } from '@/types/database';

const statuses: WorkStatus[] = ['Pipeline', 'Running', 'Running R1', 'Running R2', 'Completed'];

export default function WorkForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, user, profile } = useAuth();
  const actorName = profile?.full_name || 'Someone';
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [originalStatus, setOriginalStatus] = useState<WorkStatus>('Pipeline');
  const [isPendingR2, setIsPendingR2] = useState(false);

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
    firm: 'URBANBUILD™',
  });

  const selectedDivision = divisions.find(d => d.id === formData.division_id);
  const isRnB = selectedDivision?.code === 'RnB';
  const isRequestingR2 = formData.status === 'Running R2' && originalStatus !== 'Running R2';

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
          const fetchedStatus = work.status || 'Pipeline';
          setOriginalStatus(fetchedStatus);
          setIsPendingR2(!!work.pending_r2_approval);
          setFormData({
            ubqn: work.ubqn || '',
            work_name: work.work_name || '',
            client_name: work.client_name || '',
            division_id: work.division_id || '',
            subcategory: work.subcategory || '',
            status: fetchedStatus,
            consultancy_cost: String(work.consultancy_cost || 0),
            order_no: work.order_no || '',
            order_date: work.order_date ? work.order_date.split('T')[0] : '',
            forwarding_letter: work.forwarding_letter || '',
            invoice_no: work.invoice_no || '',
            firm: (work as any).firm || 'URBANBUILD™',
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
        description: "Please select either Road or Bridge for the RnB sector.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Determine if an approval is required
      const needsApproval = isRequestingR2 && role === 'Junior Engineer';

      const finalStatus = needsApproval ? originalStatus : formData.status;

      const workData: any = {
        ubqn: formData.ubqn.trim(),
        work_name: formData.work_name.trim(),
        client_name: formData.client_name.trim() || null,
        division_id: formData.division_id,
        subcategory: isRnB ? formData.subcategory : null,
        status: finalStatus,
        consultancy_cost: parseFloat(formData.consultancy_cost) || 0,
        firm: formData.firm,
        updated_at: new Date().toISOString(),
        // Mapping state to correct DB column names
        order_no: finalStatus !== 'Pipeline' ? formData.order_no.trim() || null : null,
        order_date: finalStatus !== 'Pipeline' ? formData.order_date || null : null,
        forwarding_letter: finalStatus === 'Completed' ? formData.forwarding_letter.trim() || null : null,
        invoice_no: finalStatus === 'Completed' ? formData.invoice_no.trim() || null : null,
      };

      if (needsApproval) {
        workData.pending_r2_approval = true;
        workData.r2_approval_requested_by = user?.id || null;
      }

      const db = supabase as any;

      if (isEdit) {
        const { data, error } = await db.from('works').update(workData).eq('id', id).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Update failed. You may not have permission to modify this record.");
      } else {
        const { data, error } = await db.from('works').insert(workData).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Creation failed. You may not have permission to add a new record.");
      }

      if (needsApproval) {
        toast({
          title: 'Approval Requested',
          description: `Your request to move this work to "Running R2" has been sent to the admins.`,
        });
        // Notify Directors about R2 approval request
        notifyDirectors({
          type: 'r2_requested',
          title: 'R2 Approval Requested',
          message: `${actorName} requested R2 approval for work ${formData.ubqn} — ${formData.work_name}`,
          link: `/works/${id}`,
          metadata: { ubqn: formData.ubqn, work_name: formData.work_name, actor: actorName },
        });
      } else {
        toast({
          title: isEdit ? 'Work updated' : 'Work created',
          description: `${formData.work_name} saved successfully.`,
        });
        // Notify Directors about work creation or update
        notifyDirectors({
          type: isEdit ? 'work_updated' : 'work_created',
          title: isEdit ? 'Work Updated' : 'New Work Created',
          message: isEdit
            ? `${actorName} updated work ${formData.ubqn} — ${formData.work_name}`
            : `${actorName} created new work ${formData.ubqn} — ${formData.work_name}`,
          link: '/works',
          metadata: { ubqn: formData.ubqn, work_name: formData.work_name, actor: actorName },
        });
      }

      navigate('/works');
    } catch (error: any) {
      toast({
        title: 'Error Saving Work',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6">
          <div>
            <Link
              to="/works"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Works
            </Link>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight font-heading">
              {isEdit ? 'Edit Work Entry' : 'Add New Work'}
            </h1>
          </div>

          {/* Pending R2 Approval Banner */}
          {isPendingR2 && isEdit && (
            <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Pending R2 Approval</h3>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  This work has been sent for Running R2 approval and is awaiting review by a Director or Assistant Director.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-2">

                <div className="space-y-1.5">
                  <Label htmlFor="ubqn" className="font-bold text-sm">UBQN *</Label>
                  <Input
                    id="ubqn"
                    value={formData.ubqn}
                    onChange={(e) => handleChange('ubqn', e.target.value)}
                    required
                    placeholder="e.g., 101"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="division_id" className="font-bold text-sm">UB Sector *</Label>
                  <Select
                    value={formData.division_id}
                    onValueChange={(v) => {
                      handleChange('division_id', v);
                      handleChange('subcategory', '');
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select UB Sector" />
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

                <div className="space-y-1.5">
                  <Label htmlFor="firm" className="font-bold text-sm">Consulting Firm *</Label>
                  <Select
                    value={formData.firm}
                    onValueChange={(v) => handleChange('firm', v)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Firm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URBANBUILD™">URBANBUILD™</SelectItem>
                      <SelectItem value="URBANBUILD™ Pvt. Ltd.">URBANBUILD™ Pvt. Ltd.</SelectItem>
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

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="work_name" className="font-bold text-sm">Work Name / Particulars *</Label>
                  <Input
                    id="work_name"
                    value={formData.work_name}
                    onChange={(e) => handleChange('work_name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client_name" className="font-bold text-sm">Client Name *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => handleChange('client_name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="consultancy_cost" className="font-bold text-sm">Consultancy Cost (₹) *</Label>
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

                <div className="space-y-1.5">
                  <Label htmlFor="status" className="font-bold text-sm">Project Status</Label>
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

                {/* Conditional Fields using order_no and order_date — hidden for Pipeline and Running R2 */}
                {formData.status !== 'Pipeline' && formData.status !== 'Running R2' && (
                  <div className="sm:col-span-2 grid gap-6 sm:grid-cols-2 p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 animate-in fade-in zoom-in-95 duration-300">
                    <div className="space-y-2">
                      <Label htmlFor="order_no" className="text-emerald-700 font-bold">Work Order No. *</Label>
                      <Input
                        id="order_no"
                        value={formData.order_no}
                        onChange={(e) => handleChange('order_no', e.target.value)}
                        required
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
                        required
                        className="border-emerald-200 focus-visible:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Specific UI for Running R2 Approval Request */}
                {formData.status === 'Running R2' && originalStatus !== 'Running R2' && role === 'Junior Engineer' && (
                  <div className="sm:col-span-2 p-6 rounded-xl bg-amber-50 border border-amber-200 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-full bg-amber-500 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase tracking-tight text-amber-900">R2 Approval Workflow</h4>
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                          Selecting 'Running R2' will trigger an approval request to the administrators. Until reviewed, the project will maintain its current status in the registry. Order details should be entered after approval.
                        </p>
                      </div>
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

            <div className="flex items-center justify-end gap-3 pt-1 pb-4">
              <Link to="/works">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading} className={cn(
                "px-10 font-bold shadow-lg transition-all active:scale-95",
                isRequestingR2 && role === 'Junior Engineer'
                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                  : "bg-primary hover:bg-primary/90"
              )}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  isRequestingR2 && role === 'Junior Engineer'
                    ? "Request R2 Approval"
                    : (isEdit ? 'Update Work Record' : 'Create Work Entry')
                )}
              </Button>
            </div>
          </form>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
