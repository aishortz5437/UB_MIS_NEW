import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Fragment } from 'react';
import { useToast } from "@/hooks/use-toast";
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
  Trash2,
  Plus,
  CheckCircle2,
  Flag,
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
import { useAuth } from '@/hooks/useAuth';
import { notifyDirectors } from '@/lib/notifications';
import { cn } from '@/lib/utils';

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
    { id: 18, label: "Payment History / Remark" }
  ],
  "Bridge": [
    { id: 1, label: "Survey" }, { id: 2, label: "Soil Testing" },
    { id: 3, label: "Hydraulic Study" }, { id: 4, label: "Design & Analysis" },
    { id: 5, label: "GA Drawings" }, { id: 6, label: "RCC Drawings" },
    { id: 7, label: "Costing & Estimation" }, { id: 8, label: "DPR Formatting" },
    { id: 9, label: "Report Printing" }, { id: 10, label: "Forwarding" },
    { id: 11, label: "Submission" }, { id: 12, label: "Voucher" }
  ],
  "Arch": [
    { id: 1, label: "Site Visit / Measurements" }, { id: 2, label: "Planning / Concept" },
    { id: 3, label: "Presentation Drawings" }, { id: 4, label: "3D Visualisation" },
    { id: 5, label: "Working Drawings" }, { id: 6, label: "Structural Design" },
    { id: 7, label: "Submission Drawings" }, { id: 8, label: "Interior Details" },
    { id: 9, label: "Plumbing / Electrical" }, { id: 10, label: "Site Supervision" }
  ],
  "Ens": [
    { id: 1, label: "Data Collection" }, { id: 2, label: "Field Study" },
    { id: 3, label: "Analysis" }, { id: 4, label: "Draft Report" },
    { id: 5, label: "Final Report" }, { id: 6, label: "Submission" }
  ]
};

const toRoman = (num: number): string => {
  const map: Record<string, number> = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let result = '';
  for (let key in map) {
    while (num >= map[key]) {
      result += key;
      num -= map[key];
    }
  }
  return result || '0';
};

export default function WorkDetail() {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();
  const actorName = profile?.full_name || 'Someone';
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    gst: '',
    it: '',
    lc: '',
    sd: '',
    bill_no: 'I/R'
  });

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
  const [editingRemarks, setEditingRemarks] = useState<Record<number, string>>({});

  useEffect(() => {
    if (work?.financial_data?.payments) {
      const type = newPayment.bill_no?.endsWith('/F') ? 'F' : 'R';
      handleBillTypeChange(type);
    }
  }, [work?.financial_data?.payments?.length]);

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
      console.log("Saved successfully");

      toast({
        title: "Success",
        description: "Financial records updated successfully.",
      });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update records.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (itemId: number, newStatus: string) => {
    if (!work || !id) return;

    const updatedChecklist = {
      ...(work.checklist || {}),
      [itemId]: {
        ...(work.checklist?.[itemId] || {}),
        status: newStatus,
        updated_at: new Date().toISOString(),
        updated_by: profile?.id
      }
    };

    const newWorkStatus = calculateOverallStatus(updatedChecklist);
    setWork({ ...work, checklist: updatedChecklist, status: newWorkStatus });

    await supabase.from('works').update({
      checklist: updatedChecklist,
      status: newWorkStatus
    }).eq('id', id);

    if (newStatus === 'checked') {
      const particular = activeParticulars.find(p => p.id === itemId);
      await notifyDirectors(
        'Checklist Updated',
        `${actorName} completed: "${particular?.label}" for work #${work.ubqn}`,
        'info'
      );
    }
  };

  const handleEditRemark = (itemId: number, currentRemark: string) => {
    setEditingRemarks(prev => ({ ...prev, [itemId]: currentRemark }));
  };

  const handleSaveRemark = async (itemId: number) => {
    if (!work || !id) return;

    const updatedChecklist = {
      ...(work.checklist || {}),
      [itemId]: {
        ...(work.checklist?.[itemId] || {}),
        remark: editingRemarks[itemId],
        updated_at: new Date().toISOString(),
        updated_by: profile?.id
      }
    };

    setWork({ ...work, checklist: updatedChecklist });
    setEditingRemarks(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    await supabase.from('works').update({ checklist: updatedChecklist }).eq('id', id);
  };

  const [raisingIssueItemId, setRaisingIssueItemId] = useState<number | null>(null);
  const [issueText, setIssueText] = useState('');

  const handleRaiseIssue = async (itemId: number) => {
    if (!work || !id || !issueText.trim()) return;

    const updatedChecklist = {
      ...(work.checklist || {}),
      [itemId]: {
        ...(work.checklist?.[itemId] || {}),
        issue: issueText,
        status: 'pending',
        updated_at: new Date().toISOString(),
        updated_by: profile?.id
      }
    };

    setWork({ ...work, checklist: updatedChecklist });
    setRaisingIssueItemId(null);
    setIssueText('');

    await supabase.from('works').update({ checklist: updatedChecklist }).eq('id', id);

    const particular = activeParticulars.find(p => p.id === itemId);
    await notifyDirectors(
      'Issue Raised',
      `${actorName} raised an issue on: "${particular?.label}" for work #${work.ubqn}. Message: ${issueText}`,
      'error'
    );
  };

  const calculateOverallStatus = (checklist: any) => {
    if (!checklist) return 'Pipeline';
    const c1Index = activeParticulars.find(p => p.label === "Submission")?.id || 15;
    const c2Index = activeParticulars.find(p => p.label === "Bill/Payment Received")?.id || 16;

    if (checklist[c2Index]?.status === 'checked') return 'Completed C2';
    if (checklist[c1Index]?.status === 'checked') return 'Completed C1';
    return 'Running R1';
  };

  const handleBillTypeChange = (type: 'F' | 'R') => {
    if (!work?.financial_data?.payments) return;
    const payments = work.financial_data.payments;
    const runningBills = payments.filter(p => !p.bill_no?.endsWith('/F'));
    
    if (type === 'F') {
      setNewPayment(prev => ({ ...prev, bill_no: 'Final/F' }));
    } else {
      const nextNum = runningBills.length + 1;
      setNewPayment(prev => ({ ...prev, bill_no: `${toRoman(nextNum)}/R` }));
    }
  };

  const handleFinancialUpdate = async (field: string, value: any) => {
    if (!work || !id) return;
    const updatedFinancial = { ...work.financial_data, [field]: value };
    const updatePayload: any = { financial_data: updatedFinancial };

    if (field === 'status') {
      let newWorkStatus = work.status;
      if (value === 'Final Bill') {
        newWorkStatus = work.status.includes('C1') ? 'Completed C2' : 'Completed C1*';
      }
      updatePayload.status = newWorkStatus;
      setWork({ ...work, financial_data: updatedFinancial, status: newWorkStatus });
    } else if (field === 'date') {
      updatePayload.financial_date = value || null;
      setWork({ ...work, financial_data: updatedFinancial, financial_date: value || null });
    } else {
      setWork({ ...work, financial_data: updatedFinancial });
    }

    await supabase.from('works').update(updatePayload).eq('id', id);
  };

  const handleAddPayment = async () => {
    if (!work || !id || !newPayment.amount || !newPayment.date) return;

    const currentFinancial = work.financial_data || { status: 'Running Bill', amount: 0, deductions: { gst: 0, it: 0, lc: 0, sd: 0 }, payments: [] };
    const payments = currentFinancial.payments || [];
    const payment = {
      id: Math.random().toString(36).substring(7),
      amount: Number(newPayment.amount),
      date: newPayment.date,
      deductions: {
        gst: Number(newPayment.gst) || 0,
        it: Number(newPayment.it) || 0,
        lc: Number(newPayment.lc) || 0,
        sd: Number(newPayment.sd) || 0,
      },
      bill_no: newPayment.bill_no || 'I/R'
    };

    const updatedFinancial = {
      ...currentFinancial,
      amount: (Number(currentFinancial.amount) || 0) + payment.amount,
      payments: [...payments, payment]
    };

    setWork({ ...work, financial_data: updatedFinancial });
    setNewPayment({ ...newPayment, amount: '', gst: '', it: '', lc: '', sd: '' });
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (!work || !id) return;
    const currentFinancial = work.financial_data;
    const removedPayment = currentFinancial.payments.find(p => p.id === paymentId);
    const updatedPayments = currentFinancial.payments.filter(p => p.id !== paymentId);

    const updatedFinancial = {
      ...currentFinancial,
      amount: (Number(currentFinancial.amount) || 0) - (removedPayment?.amount || 0),
      payments: updatedPayments
    };

    setWork({ ...work, financial_data: updatedFinancial });
    await supabase.from('works').update({ financial_data: updatedFinancial } as any).eq('id', id);
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
    const statusProgress: Record<string, number> = { 'Pipeline': 10, 'Running R1': 40, 'Running R2': 60, 'Completed C1': 100, 'Completed C2': 100, 'Completed C1*': 100 };
    return statusProgress[work.status] || 0;
  };

  const financial = work?.financial_data || {
    status: 'Running Bill',
    amount: 0,
    deductions: { gst: 0, it: 0, lc: 0, sd: 0 }
  };

  const legacyDeductions = (Number(financial.deductions?.gst) || 0) +
    (Number(financial.deductions?.it) || 0) +
    (Number(financial.deductions?.lc) || 0) +
    (Number(financial.deductions?.sd) || 0);

  const totalDeductions = legacyDeductions + (financial.payments || []).reduce((sum, p) => {
    const d = p.deductions || { gst: 0, it: 0, lc: 0, sd: 0 };
    return sum + (Number(d.gst) || 0) + (Number(d.it) || 0) + (Number(d.lc) || 0) + (Number(d.sd) || 0);
  }, 0);

  const netReceived = (Number(financial.amount) || 0) - totalDeductions;
  const outstandingAmount = Math.max(0, (Number(work?.consultancy_cost) || 0) - (Number(financial.amount) || 0));

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
              <p className="font-mono text-2xl font-bold uppercase tracking-[0.2em] text-muted-foreground/60">#{work.ubqn?.includes('-') ? work.ubqn.split('-').pop()?.trim() : work.ubqn}</p>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground font-heading">Project Summary</h2>
                <StatusBadge status={work.status} size="sm" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-1">Consultancy Cost</p>
              <p className="text-3xl font-black tracking-tighter text-primary font-heading">₹{Number(work.consultancy_cost || 0).toLocaleString('en-IN')}</p>
              {work.metadata?.include_gst && work.metadata?.base_cost && (
                <div className="mt-1 flex flex-col items-end gap-0.5 opacity-70">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase flex gap-2">
                    <span>Base:</span>
                    <span>₹{Number(work.metadata.base_cost).toLocaleString('en-IN')}</span>
                  </p>
                  <p className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase flex gap-2">
                    <span>GST (18%):</span>
                    <span>₹{Number(work.consultancy_cost - work.metadata.base_cost).toLocaleString('en-IN')}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Unified Card */}
          <div className="relative rounded-3xl border bg-muted/20 shadow-inner ring-1 ring-border/50 overflow-hidden">
            <div className="p-6 md:p-8 space-y-8">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 block mb-2">Name of Work</span>
                <p className="text-lg leading-relaxed text-foreground font-semibold italic">{work.work_name}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-background p-2 border shadow-sm"><Building2 className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Sector</p>
                    <p className="text-sm font-bold text-foreground">{work.division?.name || '-'} {work.subcategory === 'Road' || work.subcategory === 'Bridge' ? `/ ${work.subcategory}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-background p-2 border shadow-sm"><User2 className="h-4 w-4 text-primary" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Client</p>
                      {(work as any).firm === 'URBANBUILD™ Pvt. Ltd.' && (
                        <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 text-[7px] font-black px-1 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 uppercase tracking-widest shrink-0">
                          Pvt. Ltd. Work
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-foreground mt-0.5">{work.client_name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-background p-2 border shadow-sm">
                    <FileCheck2 className={cn(
                      "h-4 w-4",
                      work.metadata?.type === 'Tender' ? "text-orange-500" :
                      work.metadata?.type === 'Hand Receipt' ? "text-violet-500" :
                      "text-blue-500"
                    )} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Mode</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {work.metadata?.type === 'Hand Receipt' ? 'HR' : work.metadata?.type || 'Quotation'}
                    </p>
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

          {/* 3. Physical Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-extrabold tracking-tight text-foreground font-heading">Physical Progress</h3>
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
                  const isEditingRemark = editingRemarks[item.id] !== undefined;
                  return (
                    <Fragment key={item.id}>
                      <div className="grid grid-cols-12 items-center hover:bg-muted/5 transition-colors group">
                        <div className="col-span-6 flex items-center gap-3 p-4">
                          <span className="text-[10px] font-mono opacity-30">{item.id}</span>
                          <span className={`text-xs font-medium ${data.status === 'na' ? 'text-muted-foreground/40 line-through' : ''}`}>{item.label}</span>
                        </div>
                        <div className="col-span-3 px-2 border-x h-full flex items-center justify-center gap-2">
                          {data.status === 'checked' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                          <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/50">
                            <button 
                              onClick={() => handleStatusChange(item.id, data.status === 'checked' ? 'pending' : 'checked')} 
                              className={cn("text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all", data.status === 'checked' ? "bg-green-500 text-white shadow-sm" : "hover:bg-muted text-muted-foreground")}
                            >Done</button>
                            <button 
                              onClick={() => handleStatusChange(item.id, data.status === 'na' ? 'pending' : 'na')} 
                              className={cn("text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all", data.status === 'na' ? "bg-slate-300 text-slate-800 shadow-sm" : "hover:bg-muted text-muted-foreground")}
                            >N/A</button>
                          </div>
                        </div>
                        <div className="col-span-3 px-3 flex items-center gap-2">
                          {isEditingRemark ? (
                            <div className="flex items-center w-full gap-2">
                              <input 
                                autoFocus
                                value={editingRemarks[item.id]} 
                                onChange={(e) => setEditingRemarks(prev => ({...prev, [item.id]: e.target.value}))} 
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveRemark(item.id)}
                                className="w-full bg-background border border-border rounded-md py-1 px-2 text-xs" 
                              />
                              <button onClick={() => handleSaveRemark(item.id)} className="px-2 py-1 bg-primary text-white text-[10px] rounded-md">Save</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full group/remark">
                              <span className="text-xs text-muted-foreground truncate">{data.remark || "No remark"}</span>
                              <button onClick={() => handleEditRemark(item.id, data.remark || '')} className="opacity-0 group-hover/remark:opacity-100 p-1 hover:bg-muted rounded-md"><Pencil className="h-3 w-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Fragment>
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

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-card border shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Total Cost</p>
                <p className="text-xl font-black font-heading text-foreground">₹{Number(work.consultancy_cost || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2">Received</p>
                <p className="text-xl font-black font-heading text-primary">₹{(Number(financial.amount) || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-600/60 mb-2">Deductions</p>
                <p className="text-xl font-black font-heading text-red-600">₹{totalDeductions.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/20 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-600/60 mb-2">Net Rec.</p>
                <p className="text-xl font-black font-heading text-green-600">₹{netReceived.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/20 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-600/60 mb-2">Outstanding</p>
                <p className="text-xl font-black font-heading text-orange-600">₹{outstandingAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* LEFT: Add Record Form */}
              <div className="w-full md:w-[300px] shrink-0">
                <div className="p-6 rounded-3xl bg-primary/[0.03] border border-primary/10 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Plus className="h-4 w-4" /> New Record</h4>
                  </div>
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Type</label>
                        <div className="flex bg-background rounded-lg border border-border/50 p-0.5">
                          <button onClick={() => handleBillTypeChange('R')} className={cn("flex-1 text-[9px] font-black py-2 rounded-md transition-all", !newPayment.bill_no?.endsWith('/F') ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted")}>RUNNING</button>
                          <button onClick={() => handleBillTypeChange('F')} className={cn("flex-1 text-[9px] font-black py-2 rounded-md transition-all", newPayment.bill_no?.endsWith('/F') ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted")}>FINAL</button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Bill No</label>
                        <input value={newPayment.bill_no} onChange={(e) => setNewPayment({ ...newPayment, bill_no: e.target.value })} className="w-full bg-background rounded-lg border border-border/50 px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Date</label>
                      <input type="date" value={newPayment.date} onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })} className="w-full bg-background rounded-lg border border-border/50 px-3 py-2 text-xs font-bold outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Gross Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 font-bold text-xs">₹</span>
                        <input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} className="w-full bg-background rounded-lg border border-border/50 pl-7 pr-3 py-3 text-sm font-black text-primary outline-none focus:ring-2 focus:ring-primary/20" placeholder="0.00" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {['gst', 'it', 'lc', 'sd'].map((key) => (
                        <div key={key} className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{key.toUpperCase()}</label>
                          <input type="number" value={(newPayment as any)[key]} onChange={(e) => setNewPayment({ ...newPayment, [key]: e.target.value })} className="w-full bg-background rounded-lg border border-border/50 px-2 py-2 text-xs font-bold outline-none" />
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleAddPayment} className="w-full font-black uppercase tracking-widest py-6 rounded-2xl">Add Record</Button>
                  </div>
                </div>
              </div>

              {/* RIGHT: History Table */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Payment History</h4>
                  <span className="text-[10px] font-bold text-muted-foreground/40">{financial.payments?.length || 0} Records</span>
                </div>
                <div className="rounded-3xl border-2 border-primary/5 bg-transparent overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        <th className="px-3 py-4">Bill</th>
                        <th className="px-3 py-4">Date</th>
                        <th className="px-3 py-4 text-right">Gross</th>
                        <th className="px-3 py-4 text-right">GST</th>
                        <th className="px-3 py-4 text-right">IT</th>
                        <th className="px-3 py-4 text-right">LC</th>
                        <th className="px-3 py-4 text-right">SD</th>
                        <th className="px-4 py-4 text-right text-primary">Net</th>
                        <th className="px-4 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {financial.payments?.map((payment) => {
                        const pDeductions = (Number(payment.deductions?.gst) || 0) + (Number(payment.deductions?.it) || 0) + (Number(payment.deductions?.lc) || 0) + (Number(payment.deductions?.sd) || 0);
                        const pNet = payment.amount - pDeductions;
                        return (
                          <tr key={payment.id} className="group hover:bg-primary/[0.02] transition-colors relative">
                            <td className="px-3 py-4">
                              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-black text-xs tracking-tight">{payment.bill_no || '-'}</span>
                            </td>
                            <td className="px-3 py-4 font-bold text-muted-foreground text-xs whitespace-nowrap">{payment.date}</td>
                            <td className="px-3 py-4 font-black text-primary text-right font-mono text-sm">₹{payment.amount.toLocaleString('en-IN')}</td>
                            <td className="px-3 py-4 font-black text-primary text-right font-mono text-xs opacity-70">₹{(Number(payment.deductions?.gst) || 0).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-4 font-black text-primary text-right font-mono text-xs opacity-70">₹{(Number(payment.deductions?.it) || 0).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-4 font-black text-primary text-right font-mono text-xs opacity-70">₹{(Number(payment.deductions?.lc) || 0).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-4 font-black text-primary text-right font-mono text-xs opacity-70">₹{(Number(payment.deductions?.sd) || 0).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-4 font-black text-primary text-right font-mono text-base bg-primary/[0.01]">₹{pNet.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-4 text-center">
                              <button onClick={() => handleRemovePayment(payment.id)} className="p-2 text-muted-foreground hover:text-red-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={handleGlobalSave} disabled={isSaving} className="min-w-[260px] font-black uppercase tracking-widest py-6 rounded-2xl h-auto text-xs border-b-4 border-primary/30 shadow-xl shadow-primary/10">
                    {isSaving ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Save className="mr-3 h-4 w-4" />}
                    {isSaving ? "UPDATING RECORDS..." : "UPDATE FINANCIAL RECORDS"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}