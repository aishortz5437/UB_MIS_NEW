import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Pencil,
  Building2,
  User2,
  Lock,
  IndianRupee,
  MapPin,
  Clock,
  FileCheck2,
  Calendar,
  Shield,
  Timer,
} from 'lucide-react';
import {
  // ... existing imports
  Save,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/works/StatusBadge';
import { Progress } from '@/components/ui/progress';
import type { Work } from '@/types/database';
import { PageTransition } from '@/components/layout/PageTransition';

const CHECKLIST_TEMPLATES: Record<string, { id: number; label: string }[]> = {
  "Road": [
    { id: 1, label: "Survey" }, { id: 2, label: "Site Data / Photograph" },
    { id: 3, label: "Site Testing (CBR/FWD/BBD)" }, { id: 4, label: "L - Section" },
    { id: 5, label: "Plan" }, { id: 6, label: "Geology" }, { id: 7, label: "Alignment Report" },
    { id: 8, label: "Crust / Overlay Design" }, { id: 9, label: "Geometric Design" },
    { id: 10, label: "Necessary Drawings" }, { id: 11, label: "Costing & Estimation" },
    { id: 12, label: "DPR Formatting" }, { id: 13, label: "Report/DPR Printing" },
    { id: 14, label: "Forwarding & Invoice" }, { id: 15, label: "Submission" },
    { id: 16, label: "Bill/Payment Received" }, { id: 17, label: "Voucher" },
    { id: 18, label: "Experience Certificate" }
  ],
  "Bridge": [
    { id: 1, label: "Survey" }, { id: 2, label: "Site Data/Photographs" }, { id: 3, label: "Survey Drawings" },
    { id: 4, label: "Geology" }, { id: 5, label: "Site Selection Report" }, { id: 6, label: "Geotech" },
    { id: 7, label: "Hydrology" }, { id: 8, label: "GAD" }, { id: 9, label: "PPR" },
    { id: 10, label: "Structural Design & Drawings" }, { id: 11, label: "Vetting" }, { id: 12, label: "Estimation" },
    { id: 13, label: "DPR formatting" }, { id: 14, label: "DPR Printing" }, { id: 15, label: "Forwarding Letter" },
    { id: 16, label: "DPR Submission/Dispatch" }, { id: 17, label: "Invoice" }, { id: 18, label: "Bill/Payment Received" },
    { id: 19, label: "Voucher" }, { id: 20, label: "Experience Certificate" }
  ],
  "Arch": [
    { id: 1, label: "Site Data/Photographs" }, { id: 2, label: "Survey" }, { id: 3, label: "Conceptual Planning" },
    { id: 4, label: "Geology" }, { id: 5, label: "Architrual Drawings" }, { id: 6, label: "Geotech" },
    { id: 7, label: "Structural Drawings/DBR" }, { id: 8, label: "Vetting" }, { id: 9, label: "Cost Estimation" },
    { id: 10, label: "DPR formatting" }, { id: 11, label: "DPR Printing" }, { id: 12, label: "Forwarding Letter" },
    { id: 13, label: "DPR Submission/Dispatch" }, { id: 14, label: "Invoice" }, { id: 15, label: "Bill/Payment Received" },
    { id: 16, label: "Voucher" }, { id: 17, label: "Experience Certificate" }
  ],
  "Ens": [
    { id: 1, label: "Quotation Notice" }, { id: 2, label: "Quotations (ALL 3)" }, { id: 3, label: "Quotation Acceptance Letter" },
    { id: 4, label: "Supply order/Work order/MOU" }, { id: 5, label: "Survey" }, { id: 6, label: "Site Data / Photograph" },
    { id: 7, label: "REA Check List" }, { id: 8, label: "Bridge Category" }, { id: 9, label: "Bridge Map" },
    { id: 10, label: "Public Consultation" }, { id: 11, label: "No. of Bridge" }, { id: 12, label: "Report / Printing" },
    { id: 13, label: "Forwarding Letter" }, { id: 14, label: "Invoice/HR" }, { id: 15, label: "Observations/Objections" },
    { id: 16, label: "Submission of Soft Copy" }, { id: 17, label: "Submission" }, { id: 18, label: "Bill/Payment Received" },
    { id: 19, label: "Voucher" }, { id: 20, label: "Experience Certificate" }
  ]
};

export default function WorkDetail() {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      const { data } = await supabase
        .from('works')
        .select('*, division:divisions(*)')
        .eq('id', id)
        .maybeSingle();

      if (data) setWork((data as unknown) as Work);
      setLoading(false);
    }
    fetchData();
  }, [id]);
  const [isSaving, setIsSaving] = useState(false);

  const handleGlobalSave = async () => {
    if (!work || !id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('works')
        .update({
          financial_data: work.financial_data,
          financial_date: work.financial_date || null,
          checklist: work.checklist
        } as any)
        .eq('id', id);

      if (error) throw error;
      // You could add a toast notification here
      console.log("Saved successfully");
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- HANDLERS ---
  const handleStatusChange = async (itemId: number, newStatus: 'checked' | 'na' | 'pending') => {
    if (!work || !id) return;
    const currentData = work.checklist?.[itemId] || { status: 'pending', remark: '' };
    const updatedChecklist = { ...(work.checklist || {}), [itemId]: { ...currentData, status: newStatus } };
    setWork({ ...work, checklist: updatedChecklist });
    await supabase.from('works').update({ checklist: updatedChecklist } as any).eq('id', id);
  };

  const handleUpdateRemark = async (itemId: number, remark: string) => {
    if (!work || !id) return;
    const updatedChecklist = { ...(work.checklist || {}), [itemId]: { ...(work.checklist?.[itemId] || { status: 'pending' }), remark } };
    setWork({ ...work, checklist: updatedChecklist });
    await supabase.from('works').update({ checklist: updatedChecklist } as any).eq('id', id);
  };

  const handleFinancialUpdate = async (field: string, value: any) => {
    if (!work || !id) return;
    const updatedFinancial = {
      ...(work.financial_data || { status: 'Running Bill', amount: 0, deductions: { gst: 0, it: 0, lc: 0, sd: 0 } }),
      [field]: value,
    };
    const updatePayload: any = { financial_data: updatedFinancial };
    if (field === 'date') {
      updatePayload.financial_date = value || null;
      setWork({ ...work, financial_data: updatedFinancial, financial_date: value || null });
    } else {
      setWork({ ...work, financial_data: updatedFinancial });
    }
    await supabase.from('works').update(updatePayload).eq('id', id);
  };

  // --- HELPERS ---
  const activeParticulars = (() => {
    if (!work) return CHECKLIST_TEMPLATES["Road"];
    const sub = work.subcategory;
    const divName = work.division?.name || "";
    if (sub === 'Road') return CHECKLIST_TEMPLATES["Road"];
    if (sub === 'Bridge') return CHECKLIST_TEMPLATES["Bridge"];
    if (sub === 'Arch' || divName.includes("Building")) return CHECKLIST_TEMPLATES["Arch"];
    if (sub === 'Ens' || divName.includes("Environment") || divName.includes("Sustainability")) return CHECKLIST_TEMPLATES["Ens"];
    return CHECKLIST_TEMPLATES["Road"];
  })();

  const stats = (() => {
    if (!work || !work.checklist) return { completed: 0, total: activeParticulars.length };
    const completed = activeParticulars.filter(item => work.checklist?.[item.id]?.status === 'checked').length;
    return { completed, total: activeParticulars.length };
  })();

  const getProgressValue = () => {
    if (!work) return 0;
    const statusProgress: Record<string, number> = { 'Pipeline': 10, 'Running': 40, 'Running R1': 40, 'Running R2': 60, 'Completed': 100 };
    return statusProgress[work.status] || 0;
  };

  const financial = work?.financial_data || {
    status: 'Running Bill',
    amount: 0,
    deductions: { gst: 0, it: 0, lc: 0, sd: 0 }
  };

  if (loading) return (
    <AppLayout>
      <div className="page-shell space-y-6 font-sans">
        {/* Navigation Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>

        {/* Header Skeleton */}
        <div className="flex flex-wrap justify-between items-end border-b pb-6 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-3 w-24 ml-auto" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        {/* Main Card Skeleton */}
        <div className="rounded-3xl border bg-muted/20 p-6 md:p-8 space-y-8">
          <div>
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-2 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-2 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          <div className="pt-6 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        </div>

        {/* Progress List Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="rounded-2xl border bg-card p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-32 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );

  if (!work) return (
    <AppLayout>
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>Work not found</p>
        <Link to="/works"><Button variant="outline">Back to Works</Button></Link>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <PageTransition>
        <div className="page-shell space-y-6 font-sans">

          {/* Navigation & Edit */}
          <div className="flex items-center justify-between">
            <Link to="/works" className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Works
            </Link>
            <Button size="sm" variant="outline" className="h-8 gap-2 border-primary/20 hover:bg-primary/5 shadow-sm" asChild>
              <Link to={`/works/${id}/edit`}><Pencil className="h-3.5 w-3.5" /> Update Work</Link>
            </Button>
          </div>

          {/* 1. Project Summary Header */}
          <div className="flex flex-wrap justify-between items-end border-b pb-6 gap-4">
            <div className="space-y-1">
              <p className="font-mono text-2xl font-bold uppercase tracking-[0.2em] text-muted-foreground/60">#{work.ubqn}</p>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground font-heading">Project Summary</h2>
                <StatusBadge status={work.status} size="sm" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-1">Consultancy Cost</p>
              <p className="text-3xl font-black tracking-tighter text-primary font-heading">₹{Number(work.consultancy_cost || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* 2. Unified Card */}
          <div className="relative rounded-3xl border bg-muted/20 shadow-inner ring-1 ring-border/50 overflow-hidden">
            <div className="p-6 md:p-8 space-y-8">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 block mb-2">Scope of Work</span>
                <p className="text-lg leading-relaxed text-foreground font-semibold italic">{work.work_name}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-background p-2 border shadow-sm"><Building2 className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">UB Sector</p>
                    <p className="text-sm font-bold text-foreground">{work.division?.name || '-'} {work.subcategory ? `/ ${work.subcategory}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-background p-2 border shadow-sm"><User2 className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Client Authority</p>
                    <p className="text-sm font-bold text-foreground">{work.client_name || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-muted-foreground/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Workflow Progress</span>
                  <span className="text-xs font-bold text-primary">{getProgressValue()}%</span>
                </div>
                <Progress value={getProgressValue()} className="h-2.5 bg-primary/10" />
              </div>
            </div>
          </div>

          {/* 2b. Additional Details (Address, Metadata) */}
          {(work.address || (work.metadata && Object.keys(work.metadata).length > 1)) && (
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  {work.metadata?.type === 'Tender' ? 'Tender Details' : work.metadata?.type === 'Hand Receipt' ? 'Hand Receipt Details' : 'Additional Details'}
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Address */}
                  {work.address && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="rounded-lg bg-background p-2 border shadow-sm mt-0.5"><MapPin className="h-3.5 w-3.5 text-primary" /></div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Address</p>
                        <p className="text-sm font-semibold text-foreground">{work.address}</p>
                      </div>
                    </div>
                  )}

                  {/* Division (client entry) */}
                  {work.metadata?.sector && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="rounded-lg bg-background p-2 border shadow-sm mt-0.5"><Building2 className="h-3.5 w-3.5 text-primary" /></div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Division</p>
                        <p className="text-sm font-semibold text-foreground">{work.metadata.sector}</p>
                      </div>
                    </div>
                  )}

                  {/* Tender-specific fields */}
                  {work.metadata?.type === 'Tender' && (
                    <>
                      {work.metadata.tender_id && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="rounded-lg bg-background p-2 border shadow-sm mt-0.5"><FileCheck2 className="h-3.5 w-3.5 text-orange-500" /></div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tender ID</p>
                            <p className="text-sm font-semibold text-foreground font-mono">{work.metadata.tender_id}</p>
                          </div>
                        </div>
                      )}

                      {work.metadata.tender_upload_last_date && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="rounded-lg bg-background p-2 border shadow-sm mt-0.5"><Calendar className="h-3.5 w-3.5 text-red-500" /></div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Upload Deadline</p>
                            <p className="text-sm font-semibold text-foreground">
                              {work.metadata.tender_upload_last_date}{work.metadata.tender_upload_last_time ? ` at ${work.metadata.tender_upload_last_time}` : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {work.metadata.tender_opening_date && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="rounded-lg bg-background p-2 border shadow-sm mt-0.5"><Clock className="h-3.5 w-3.5 text-amber-500" /></div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Opening Date</p>
                            <p className="text-sm font-semibold text-foreground">
                              {work.metadata.tender_opening_date}{work.metadata.tender_opening_time ? ` at ${work.metadata.tender_opening_time}` : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {work.metadata.emd_cost > 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="rounded-lg bg-background p-2 border shadow-sm mt-0.5"><IndianRupee className="h-3.5 w-3.5 text-emerald-500" /></div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">EMD Cost</p>
                            <p className="text-sm font-black text-emerald-600 font-mono">₹{Number(work.metadata.emd_cost).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      )}

                      {work.metadata.validity_of_tender && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="rounded-lg bg-background p-2 border shadow-sm mt-0.5"><Shield className="h-3.5 w-3.5 text-blue-500" /></div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Validity</p>
                            <p className="text-sm font-semibold text-foreground">{work.metadata.validity_of_tender}</p>
                          </div>
                        </div>
                      )}

                      {work.metadata.completion_period && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="rounded-lg bg-background p-2 border shadow-sm mt-0.5"><Timer className="h-3.5 w-3.5 text-purple-500" /></div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Completion Period</p>
                            <p className="text-sm font-semibold text-foreground">{work.metadata.completion_period}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Hand Receipt mode */}
                  {work.metadata?.type === 'Hand Receipt' && work.metadata.mode && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="rounded-lg bg-background p-2 border shadow-sm mt-0.5"><FileCheck2 className="h-3.5 w-3.5 text-violet-500" /></div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mode</p>
                        <p className="text-sm font-semibold text-foreground">{work.metadata.mode}{work.metadata.letter_no ? ` — ${work.metadata.letter_no}` : ''}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Specific Condition (full width) */}
                {work.metadata?.specific_condition && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Specific Condition</p>
                    <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{work.metadata.specific_condition}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Physical Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-extrabold tracking-tight text-foreground font-heading">Physical Progress {work.subcategory ? `(${work.subcategory})` : ''}</h3>
              <div className="flex items-center gap-2 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Completed</span>
                <span className="text-xs font-bold text-primary">{stats.completed} / {stats.total}</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="grid grid-cols-12 border-b bg-muted/50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <div className="col-span-6 flex items-center gap-2">Particulars</div>
                <div className="col-span-3 text-center border-x">Status</div>
                <div className="col-span-3 pl-4">Remark</div>
              </div>
              <div className="divide-y">
                {activeParticulars.map((item) => {
                  const data = work.checklist?.[item.id] || { status: 'pending', remark: '' };
                  const isLocked = data.status !== 'checked';
                  return (
                    <div key={item.id} className="grid grid-cols-12 items-center hover:bg-muted/5 transition-colors">
                      <div className="col-span-6 flex items-center gap-3 p-4">
                        <span className="text-[10px] font-mono opacity-30">{item.id}</span>
                        <span className={`text-xs font-medium ${data.status === 'na' ? 'text-muted-foreground/40 line-through' : ''}`}>{item.label}</span>
                      </div>
                      <div className="col-span-3 px-2 border-x h-full flex items-center justify-center">
                        <select value={data.status} onChange={(e) => handleStatusChange(item.id, e.target.value as any)} className="bg-transparent text-[11px] font-bold uppercase tracking-tighter outline-none cursor-pointer w-full text-center">
                          <option value="pending">Select...</option>
                          <option value="checked">Yes</option>
                          <option value="na">N/A</option>
                        </select>
                      </div>
                      <div className={`col-span-3 px-3 flex items-center gap-2 transition-opacity ${isLocked ? 'opacity-30' : 'opacity-100'}`}>
                        {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        <input type="text" disabled={isLocked} value={data.remark || ""} onChange={(e) => handleUpdateRemark(item.id, e.target.value)} placeholder={isLocked ? "Locked" : "Add note..."} className="w-full bg-transparent py-2 text-xs outline-none border-none focus:ring-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Financial Progress Section */}
          <div className="space-y-4 pt-6">
            <div className="flex items-center gap-2 px-1">
              <IndianRupee className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-extrabold tracking-tight text-foreground font-heading">Financial Progress</h3>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Status */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Status</label>
                  <select
                    value={financial.status}
                    onChange={(e) => handleFinancialUpdate('status', e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="Running Bill">Running Bill</option>
                    <option value="Final Bill">Final Bill</option>
                  </select>
                </div>

                {/* Amount Received */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount Received (₹)</label>
                  <input
                    type="number"
                    value={financial.amount || ''}
                    onChange={(e) => handleFinancialUpdate('amount', e.target.value)}
                    placeholder="Enter amount"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={financial.date || ''}
                    onChange={(e) => handleFinancialUpdate('date', e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              {/* Deductions - Only visible if Final Bill is selected */}
              {financial.status === 'Final Bill' && (
                <div className="pt-6 border-t animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary">Deductions Breakdown</label>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['GST', 'IT', 'LC', 'SD'].map((label) => {
                      const key = label.toLowerCase();
                      return (
                        <div key={label} className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border/50">
                          <label className="text-[9px] font-bold text-muted-foreground uppercase">{label}</label>
                          <input
                            type="number"
                            value={financial.deductions?.[key] || ''}
                            onChange={(e) => {
                              const newDeds = { ...(financial.deductions || {}), [key]: e.target.value };
                              handleFinancialUpdate('deductions', newDeds);
                            }}
                            className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-muted-foreground/30"
                            placeholder="0.00"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <Button
                onClick={handleGlobalSave}
                disabled={isSaving}
                size="sm"
                className="rounded-full px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Save Financial Details"}
              </Button>

            </div>
          </div>

        </div>
      </PageTransition>
    </AppLayout>
  );
}