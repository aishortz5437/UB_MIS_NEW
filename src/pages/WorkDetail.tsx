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
import { ActivityFeed } from '@/components/works/ActivityFeed';
import { GanttChart } from '@/components/works/GanttChart';

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

const toRoman = (num: number): string => {
  const map: Record<string, number> = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let result = '';
  for (const key in map) {
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
  const { profile, isDirector } = useAuth();
  const canRevert = isDirector;
  const { toast } = useToast();
  const actorName = profile?.full_name || 'Someone';
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    gst: '',
    it: '',
    lc: '',
    sd: '',
    bill_no: 'I/R',
    work_detail: ''
  });
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [useBaseGst, setUseBaseGst] = useState(false);
  const [baseAmount, setBaseAmount] = useState('');
  const [progressView, setProgressView] = useState<'list' | 'gantt'>('list');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .eq('id', id);

      if (error) throw error;
      console.log("Saved successfully");

      toast({
        title: "Success",
        description: "Financial records updated successfully.",
      });
    } catch (error: unknown) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update records.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (itemId: number, newStatus: 'checked' | 'na' | 'pending') => {
    if (!work || !id) return;

    const existingStatus = work.checklist?.[itemId]?.status;
    if ((existingStatus === 'checked' || existingStatus === 'na') && !canRevert) {
      toast({
        title: "Action Restricted",
        description: "Once marked as Done or N/A, this checklist item cannot be modified without Director permission.",
        variant: "destructive",
      });
      return;
    }

    const updatedChecklist = {
      ...(work.checklist || {}),
      [itemId]: {
        ...(work.checklist?.[itemId] || {}),
        status: newStatus,
        updated_at: new Date().toISOString(),
        updated_by: profile?.id
      }
    } as NonNullable<Work['checklist']>;

    const newWorkStatus = calculateOverallStatus(updatedChecklist);
    setWork({ ...work, checklist: updatedChecklist, status: newWorkStatus });

    await supabase.from('works').update({
      checklist: updatedChecklist,
      status: newWorkStatus
    } as any).eq('id', id); // eslint-disable-line @typescript-eslint/no-explicit-any

    if (newStatus === 'checked') {
      const particular = activeParticulars.find(p => p.id === itemId);
      await notifyDirectors({
        title: 'Checklist Updated',
        message: `${actorName} completed: "${particular?.label}" for work #${work.ubqn}`,
        type: 'checklist_updated'
      });
      // Add system log
      await supabase.from('remarks').insert({
        work_id: id,
        type: 'system_log',
        text: `${actorName} marked physical progress "${particular?.label}" as Done.`
      } as any);
    }
  };

  const handleUpdateDates = async (itemId: number, start_date?: string, due_date?: string) => {
    if (!work || !id) return;
    const existingItem = work.checklist?.[itemId] || { status: 'pending' as const };

    const updatedChecklist = {
      ...(work.checklist || {}),
      [itemId]: {
        ...existingItem,
        start_date,
        due_date,
        updated_at: new Date().toISOString(),
        updated_by: profile?.id
      }
    } as NonNullable<Work['checklist']>;

    setWork({ ...work, checklist: updatedChecklist });
    await (supabase.from('works') as any).update({ checklist: updatedChecklist }).eq('id', id);

    const particular = activeParticulars.find(p => p.id === itemId);
    if (start_date || due_date) {
      await supabase.from('remarks').insert({
        work_id: id,
        type: 'system_log',
        text: `${actorName} updated timeline for "${particular?.label}".`
      } as any);
    }
  };

  const handleEditRemark = (itemId: number, currentRemark: string) => {
    setEditingRemarks(prev => ({ ...prev, [itemId]: currentRemark }));
  };

  const handleSaveRemark = async (itemId: number) => {
    if (!work || !id) return;

    const existingItem = work.checklist?.[itemId] || { status: 'pending' };
    const updatedChecklist = {
      ...(work.checklist || {}),
      [itemId]: {
        ...existingItem,
        remark: editingRemarks[itemId],
        updated_at: new Date().toISOString(),
        updated_by: profile?.id
      }
    } as NonNullable<Work['checklist']>;

    setWork({ ...work, checklist: updatedChecklist });
    setEditingRemarks(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('works') as any).update({ checklist: updatedChecklist }).eq('id', id);
  };

  const [raisingIssueItemId, setRaisingIssueItemId] = useState<number | null>(null);
  const [issueText, setIssueText] = useState('');

  const handleRaiseIssue = async (itemId: number) => {
    if (!work || !id || !issueText.trim()) return;

    const existingItem = work.checklist?.[itemId] || {};
    const updatedChecklist = {
      ...(work.checklist || {}),
      [itemId]: {
        ...existingItem,
        issue: issueText,
        status: 'pending',
        updated_at: new Date().toISOString(),
        updated_by: profile?.id
      }
    } as NonNullable<Work['checklist']>;

    setWork({ ...work, checklist: updatedChecklist });
    setRaisingIssueItemId(null);
    setIssueText('');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('works') as any).update({ checklist: updatedChecklist }).eq('id', id);

    const particular = activeParticulars.find(p => p.id === itemId);
    await notifyDirectors({
      title: 'Issue Raised',
      message: `${actorName} raised an issue on: "${particular?.label}" for work #${work.ubqn}. Message: ${issueText}`,
      type: 'issue_raised'
    });
  };

  const handleResolveIssue = async (itemId: number) => {
    if (!work || !id) return;

    const existingItem = work.checklist?.[itemId];
    if (!existingItem || !existingItem.issue) return;

    const updatedItem = {
      ...existingItem,
      updated_at: new Date().toISOString(),
      updated_by: profile?.id
    };
    delete (updatedItem as any).issue;

    const updatedChecklist = {
      ...(work.checklist || {}),
      [itemId]: updatedItem
    } as NonNullable<Work['checklist']>;

    setWork({ ...work, checklist: updatedChecklist });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('works') as any).update({ checklist: updatedChecklist }).eq('id', id);

    const particular = activeParticulars.find(p => p.id === itemId);
    await supabase.from('remarks').insert({
      work_id: id,
      type: 'system_log',
      text: `${actorName} resolved the issue on: "${particular?.label}".`
    } as any);
  };

  const calculateOverallStatus = (checklist: NonNullable<Work['checklist']>) => {
    if (!checklist) return 'Pipeline';
    const c1Index = activeParticulars.find(p => p.label === "Submission" || p.label === "DPR Submission/Dispatch")?.id || 15;
    const c2Index = activeParticulars.find(p => p.label === "Bill/Payment Received")?.id || 16;

    if (checklist[c2Index]?.status === 'checked') return 'Completed C2';
    if (checklist[c1Index]?.status === 'checked') return 'Completed C1';
    
    // Preserve advanced statuses if they are not completed
    if (work?.status === 'Running R2') return 'Running R2';
    if (work?.status === 'Completed C1*') return 'Completed C1*';
    
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

  const handleFinancialUpdate = async (field: string, value: unknown) => {
    if (!work || !id) return;
    const updatedFinancial = { ...work.financial_data, [field]: value };
    const updatePayload: Record<string, unknown> = { financial_data: updatedFinancial };

    if (field === 'status') {
      let newWorkStatus = work.status;
      if (value === 'Final Bill') {
        newWorkStatus = work.status.includes('C1') ? 'Completed C2' : 'Completed C1*';
      }
      updatePayload.status = newWorkStatus;
      setWork({ ...work, financial_data: updatedFinancial, status: newWorkStatus });
    } else if (field === 'date') {
      updatePayload.financial_date = (value as string) || null;
      setWork({ ...work, financial_data: updatedFinancial, financial_date: (value as string) || null });
    } else {
      setWork({ ...work, financial_data: updatedFinancial });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('works').update(updatePayload as any).eq('id', id);

    if (field === 'status') {
      await supabase.from('remarks').insert({
        work_id: id,
        type: 'system_log',
        text: `${actorName} updated financial status to "${value}".`
      } as any);
    }
  };

  const handleAddPayment = async () => {
    if (!work || !id || !newPayment.amount || !newPayment.date) return;

    const currentFinancial = work.financial_data || { status: 'Running Bill', amount: 0, deductions: { gst: 0, it: 0, lc: 0, sd: 0 }, payments: [] };
    const payments = currentFinancial.payments || [];

    let updatedPayments;
    let updatedTotalAmount;
    let actionText = '';

    if (editingPaymentId) {
      const oldPayment = payments.find(p => p.id === editingPaymentId);
      const oldAmount = oldPayment ? Number(oldPayment.amount) || 0 : 0;
      const newAmount = Number(newPayment.amount);

      updatedPayments = payments.map(p => {
        if (p.id === editingPaymentId) {
          return {
            ...p,
            amount: newAmount,
            date: newPayment.date,
            deductions: {
              gst: Number(newPayment.gst) || 0,
              it: Number(newPayment.it) || 0,
              lc: Number(newPayment.lc) || 0,
              sd: Number(newPayment.sd) || 0,
            },
            bill_no: newPayment.bill_no || 'I/R',
            work_detail: newPayment.work_detail
          };
        }
        return p;
      });

      updatedTotalAmount = (Number(currentFinancial.amount) || 0) - oldAmount + newAmount;
      actionText = `updated a payment entry (Ref: ${newPayment.bill_no || 'I/R'}) to ₹${newAmount.toLocaleString('en-IN')}`;
    } else {
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
        bill_no: newPayment.bill_no || 'I/R',
        work_detail: newPayment.work_detail
      };

      updatedPayments = [...payments, payment];
      updatedTotalAmount = (Number(currentFinancial.amount) || 0) + payment.amount;
      actionText = `added a payment entry of ₹${payment.amount.toLocaleString('en-IN')} (Ref: ${payment.bill_no || 'I/R'})`;
    }

    const updatedFinancial = {
      ...currentFinancial,
      amount: updatedTotalAmount,
      payments: updatedPayments
    };

    setWork({ ...work, financial_data: updatedFinancial });
    setNewPayment({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      gst: '',
      it: '',
      lc: '',
      sd: '',
      bill_no: 'I/R',
      work_detail: ''
    });
    setBaseAmount('');
    setEditingPaymentId(null);

    // Save immediately
    const { error } = await supabase
      .from('works')
      .update({ financial_data: updatedFinancial } as any)
      .eq('id', id);

    if (error) {
      toast({
        title: "Error saving payment",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: editingPaymentId ? "Payment Updated" : "Payment Added",
      description: `Successfully ${editingPaymentId ? 'updated' : 'added'} payment entry.`,
    });

    await supabase.from('remarks').insert({
      work_id: id,
      type: 'system_log',
      text: `${actorName} ${actionText}.`
    } as any);
  };

  const handleEditPaymentStart = (payment: any) => {
    setEditingPaymentId(payment.id);
    setNewPayment({
      amount: String(payment.amount),
      date: payment.date,
      gst: String(payment.deductions?.gst || ''),
      it: String(payment.deductions?.it || ''),
      lc: String(payment.deductions?.lc || ''),
      sd: String(payment.deductions?.sd || ''),
      bill_no: payment.bill_no || 'I/R',
      work_detail: payment.work_detail || ''
    });
    setBaseAmount('');
  };

  const handleCancelEdit = () => {
    setEditingPaymentId(null);
    setNewPayment({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      gst: '',
      it: '',
      lc: '',
      sd: '',
      bill_no: 'I/R',
      work_detail: ''
    });
    setBaseAmount('');
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (!work || !id) return;
    const currentFinancial = work.financial_data;
    if (!currentFinancial || !currentFinancial.payments) return;
    const removedPayment = currentFinancial.payments.find(p => p.id === paymentId);
    const updatedPayments = currentFinancial.payments.filter(p => p.id !== paymentId);

    const updatedFinancial = {
      ...currentFinancial,
      amount: (Number(currentFinancial.amount) || 0) - (removedPayment?.amount || 0),
      payments: updatedPayments
    };

    setWork({ ...work, financial_data: updatedFinancial });
    if (editingPaymentId === paymentId) {
      handleCancelEdit();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('works').update({ financial_data: updatedFinancial } as any).eq('id', id);

    toast({
      title: "Payment Removed",
      description: "Successfully removed the payment entry.",
    });

    await supabase.from('remarks').insert({
      work_id: id,
      type: 'system_log',
      text: `${actorName} removed a payment entry.`
    } as any);
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
                    <span>₹{Number(work.consultancy_cost - (work.metadata?.base_cost as number || 0)).toLocaleString('en-IN')}</span>
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
                      {work.firm === 'URBANBUILD™ Pvt. Ltd.' && (
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
                      {work.metadata?.type === 'Hand Receipt' ? 'HR' : (work.metadata?.type as string) || 'Quotation'}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-extrabold tracking-tight text-foreground font-heading">Physical Progress</h3>
                <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
                  <button
                    onClick={() => setProgressView('list')}
                    className={cn("text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all", progressView === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                  >List</button>
                  <button
                    onClick={() => setProgressView('gantt')}
                    className={cn("text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all", progressView === 'gantt' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                  >Timeline(Test v1.0)</button>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Completed</span>
                <span className="text-xs font-bold text-primary">{stats.completed} / {stats.total}</span>
              </div>
            </div>

            {progressView === 'gantt' ? (
              <GanttChart
                checklist={work.checklist || {}}
                activeParticulars={activeParticulars}
                onUpdateDates={handleUpdateDates}
                canRevert={canRevert}
              />
            ) : (
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
                                disabled={!canRevert && (data.status === 'checked' || data.status === 'na')}
                                className={cn("text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all", data.status === 'checked' ? "bg-green-500 text-white shadow-sm" : "hover:bg-muted text-muted-foreground", (!canRevert && (data.status === 'checked' || data.status === 'na')) && "opacity-80 cursor-not-allowed")}
                              >Done</button>
                              <button
                                onClick={() => handleStatusChange(item.id, data.status === 'na' ? 'pending' : 'na')}
                                disabled={!canRevert && (data.status === 'checked' || data.status === 'na')}
                                className={cn("text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all", data.status === 'na' ? "bg-slate-300 text-slate-800 shadow-sm" : "hover:bg-muted text-muted-foreground", (!canRevert && (data.status === 'checked' || data.status === 'na')) && "opacity-80 cursor-not-allowed")}
                              >N/A</button>
                            </div>
                             {!canRevert && (data.status === 'checked' || data.status === 'na') && (
                               <span title="Locked (Needs Approval)">
                                 <Lock className="h-3 w-3 text-muted-foreground/50 ml-1 shrink-0" />
                               </span>
                             )}
                            <button
                              onClick={() => {
                                setRaisingIssueItemId(raisingIssueItemId === item.id ? null : item.id);
                                setIssueText(data.issue || '');
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                data.issue ? "bg-red-500 text-white shadow-md shadow-red-200" : "hover:bg-red-50 text-red-400 hover:text-red-600"
                              )}
                              title={data.issue ? "View/Edit Issue" : "Raise Issue"}
                            >
                              <Flag className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="col-span-3 px-3 flex items-center gap-2">
                            {isEditingRemark ? (
                              <div className="flex items-center w-full gap-2">
                                <input
                                  autoFocus
                                  value={editingRemarks[item.id]}
                                  onChange={(e) => setEditingRemarks(prev => ({ ...prev, [item.id]: e.target.value }))}
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

                        {/* Issue Input/Display Area */}
                        {(raisingIssueItemId === item.id || data.issue) && (
                          <div className={cn(
                            "bg-red-50/30 px-12 py-3 border-t border-red-100/50 flex items-start gap-4",
                            raisingIssueItemId === item.id && "bg-red-50/50"
                          )}>
                            <div className="pt-1"><Flag className="h-3 w-3 text-red-500" /></div>
                            <div className="flex-1">
                              {raisingIssueItemId === item.id ? (
                                <div className="flex items-center gap-3">
                                  <input
                                    autoFocus
                                    placeholder="Describe the issue..."
                                    value={issueText}
                                    onChange={(e) => setIssueText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRaiseIssue(item.id)}
                                    className="flex-1 bg-white border border-red-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-red-200 outline-none"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleRaiseIssue(item.id)}
                                      className="h-8 bg-red-600 hover:bg-red-700 text-[10px] font-black uppercase tracking-widest"
                                    >
                                      Submit Issue
                                    </Button>
                                    <button
                                      onClick={() => { setRaisingIssueItemId(null); setIssueText(''); }}
                                      className="text-[10px] font-bold text-muted-foreground px-2 hover:text-foreground"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between w-full">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Active Issue</p>
                                    <p className="text-xs font-medium text-red-800">{data.issue}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResolveIssue(item.id)}
                                    className="h-7 text-[10px] border-red-200 text-red-600 hover:bg-red-50 ml-4 shrink-0"
                                  >
                                    Resolve Issue
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Financial Progress Section */}
          <div className="pt-10 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <IndianRupee className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-foreground font-heading leading-none">Financial Progress</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 opacity-60">Realization & History</p>
                </div>
              </div>
            </div>

            {/* BENTO GRID CONTAINER */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Total Consultancy */}
              <div className="md:col-span-4 p-6 rounded-[2rem] bg-white border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Total Consultancy</p>
                <p className="text-2xl font-black font-heading text-foreground tracking-tighter">₹{Number(work.consultancy_cost || 0).toLocaleString('en-IN')}</p>
                <div className="mt-4 h-1.5 w-12 bg-primary/20 rounded-full" />
              </div>

              {/* Total Deductions */}
              <div className="md:col-span-4 p-6 rounded-[2rem] bg-red-50 border border-red-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-600/60 mb-2">Total Deductions</p>
                <p className="text-2xl font-black font-heading text-red-600 tracking-tighter">₹{totalDeductions.toLocaleString('en-IN')}</p>
                <div className="mt-4 h-1.5 w-12 bg-red-400/40 rounded-full" />
              </div>

              {/* Net Received */}
              <div className="md:col-span-4 p-6 rounded-[2rem] bg-green-50 border border-green-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-600/60 mb-2">Net Received</p>
                <p className="text-2xl font-black font-heading text-green-600 tracking-tighter">₹{netReceived.toLocaleString('en-IN')}</p>
                <div className="mt-4 h-1.5 w-12 bg-green-400/40 rounded-full" />
              </div>

              {/* Entry Form */}
              <div className={cn("md:col-span-4 relative p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-full hover:shadow-md transition-all", editingPaymentId ? "bg-amber-50/20 border-amber-200 ring-1 ring-amber-100" : "bg-primary/[0.03] border-primary/10")}>
                <div className="flex items-center justify-between border-b pb-4 mb-5 border-border/60">
                  <h4 className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                    {editingPaymentId ? (
                      <>
                        <Pencil className="h-4 w-4 text-amber-500" />
                        Edit Entry
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 text-primary" />
                        Add New Payment
                      </>
                    )}
                  </h4>
                  {editingPaymentId && (
                    <button onClick={handleCancelEdit} className="text-[10px] font-bold text-amber-600 hover:text-amber-800 uppercase tracking-widest">
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Bill Type</label>
                      <div className="flex bg-background rounded-xl border border-border/50 p-1">
                        <button onClick={() => handleBillTypeChange('R')} className={cn("flex-1 text-[9px] font-black py-2 rounded-lg transition-all", !newPayment.bill_no?.endsWith('/F') ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted")}>RUN</button>
                        <button onClick={() => handleBillTypeChange('F')} className={cn("flex-1 text-[9px] font-black py-2 rounded-lg transition-all", newPayment.bill_no?.endsWith('/F') ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted")}>FIN</button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Bill/Ref No</label>
                      <input value={newPayment.bill_no} onChange={(e) => setNewPayment({ ...newPayment, bill_no: e.target.value })} className="w-full bg-background rounded-xl border border-border/50 px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Date</label>
                      <input type="date" value={newPayment.date} onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })} className="w-full bg-background rounded-xl border border-border/50 px-3 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Amount</label>
                        <button onClick={() => { setUseBaseGst(!useBaseGst); if (!useBaseGst) setBaseAmount(''); }} className="text-[8px] font-black text-primary/60 hover:text-primary uppercase tracking-widest">
                          {useBaseGst ? "Use Gross" : "Base+GST"}
                        </button>
                      </div>
                      {useBaseGst ? (
                        <div className="relative group">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-primary/40 font-black">BASE</span>
                          <input type="number" value={baseAmount} onChange={(e) => {
                            const val = e.target.value; setBaseAmount(val);
                            const num = Number(val) || 0; const gst = Math.round(num * 0.18);
                            setNewPayment({ ...newPayment, amount: String(num + gst), gst: String(gst) });
                          }} className="w-full bg-background/50 rounded-xl border border-border/50 pl-10 pr-2 py-2.5 text-[11px] font-black text-primary outline-none focus:bg-background transition-colors" placeholder="0" />
                        </div>
                      ) : (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 font-black text-sm">₹</span>
                          <input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} className="w-full bg-background rounded-xl border border-border/50 pl-7 pr-3 py-2.5 text-xs font-black text-primary outline-none focus:ring-2 focus:ring-primary/20" placeholder="Gross" />
                        </div>
                      )}
                    </div>
                  </div>



                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Deductions</label>
                      <button onClick={() => {
                        const gross = Number(newPayment.amount) || 0;
                        setNewPayment({ ...newPayment, it: String(Math.round(gross * 0.02)), lc: String(Math.round(gross * 0.01)), sd: String(Math.round(gross * 0.10)) });
                      }} className="text-[8px] font-black bg-primary/10 text-primary px-2 py-1 rounded-md uppercase hover:bg-primary/20 transition-colors">Auto Fill</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {['gst', 'it', 'lc', 'sd'].map((key) => (
                        <div key={key} className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[7px] text-muted-foreground/40 font-bold uppercase">{key}</span>
                          <input type="number" value={newPayment[key as keyof typeof newPayment]} onChange={(e) => setNewPayment({ ...newPayment, [key]: e.target.value })} className="w-full bg-background/50 rounded-lg border border-border/50 pl-6 pr-1 py-2 text-[10px] font-bold outline-none text-center focus:bg-background transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-primary/5 flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">Net Realizable</span>
                    <span className="text-lg font-black text-primary tracking-tight">₹{((Number(newPayment.amount) || 0) - ((Number(newPayment.gst) || 0) + (Number(newPayment.it) || 0) + (Number(newPayment.lc) || 0) + (Number(newPayment.sd) || 0))).toLocaleString('en-IN')}</span>
                  </div>
                  {editingPaymentId ? (
                    <div className="flex gap-2">
                      <Button onClick={handleCancelEdit} variant="outline" className="flex-1 font-black uppercase tracking-widest py-5 rounded-xl text-xs">Cancel</Button>
                      <Button onClick={handleAddPayment} className="flex-[2] font-black uppercase tracking-widest py-5 rounded-xl shadow-xl shadow-amber-200 bg-amber-600 hover:bg-amber-700 text-xs">Update Entry</Button>
                    </div>
                  ) : (
                    <Button onClick={handleAddPayment} className="w-full font-black uppercase tracking-widest py-5 rounded-xl shadow-xl shadow-primary/20 text-xs">Add New Payment</Button>
                  )}
                </div>
              </div>

              {/* History Table */}
              <div className="md:col-span-8 flex flex-col gap-4">
                <div className="flex-1 rounded-[2.5rem] border bg-card shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className="px-6 py-5 border-b bg-muted/20 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Payment History</h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-background border text-[10px] font-black text-muted-foreground/60">{financial.payments?.length || 0} Records</span>
                  </div>

                  <div className="flex-1 overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left min-w-[650px]">
                      <thead>
                        <tr className="border-b bg-muted/10 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                          <th className="pl-6 pr-2 py-4">Bill</th>
                          <th className="px-2 py-4">Date</th>
                          <th className="px-2 py-4 text-right">Gross</th>
                          <th className="px-2 py-4 text-right text-red-600">GST</th>
                          <th className="px-2 py-4 text-right text-red-600">IT</th>
                          <th className="px-2 py-4 text-right text-red-600">LC</th>
                          <th className="px-2 py-4 text-right text-red-600">SD</th>
                          <th className="px-2 py-4 text-right text-primary">Net</th>
                          <th className="pl-2 pr-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {financial.payments?.length ? (
                          financial.payments.map((payment) => {
                            const pDeductions = (Number(payment.deductions?.gst) || 0) + (Number(payment.deductions?.it) || 0) + (Number(payment.deductions?.lc) || 0) + (Number(payment.deductions?.sd) || 0);
                            const pNet = payment.amount - pDeductions;
                            const isBeingEdited = editingPaymentId === payment.id;
                            return (
                              <tr key={payment.id} className={cn("group hover:bg-muted/5 transition-colors", isBeingEdited && "bg-amber-50/20 hover:bg-amber-50/30 border-l-4 border-l-amber-500")}>
                                <td className="pl-6 pr-2 py-3.5">
                                  <span className={cn("px-2 py-1 rounded-lg font-black text-[9px] tracking-widest uppercase", payment.bill_no?.endsWith('/F') ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary")}>{payment.bill_no || '-'}</span>
                                </td>
                                <td className="px-2 py-3.5 text-[11px] font-bold text-muted-foreground whitespace-nowrap">{payment.date}</td>
                                <td className="px-2 py-3.5 text-right font-black text-xs tracking-tight whitespace-nowrap">₹{payment.amount.toLocaleString('en-IN')}</td>
                                <td className="px-2 py-3.5 text-right font-medium text-xs text-red-600/80 whitespace-nowrap">₹{(payment.deductions?.gst || 0).toLocaleString('en-IN')}</td>
                                <td className="px-2 py-3.5 text-right font-medium text-xs text-red-600/80 whitespace-nowrap">₹{(payment.deductions?.it || 0).toLocaleString('en-IN')}</td>
                                <td className="px-2 py-3.5 text-right font-medium text-xs text-red-600/80 whitespace-nowrap">₹{(payment.deductions?.lc || 0).toLocaleString('en-IN')}</td>
                                <td className="px-2 py-3.5 text-right font-medium text-xs text-red-600/80 whitespace-nowrap">₹{(payment.deductions?.sd || 0).toLocaleString('en-IN')}</td>
                                <td className="px-2 py-3.5 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-green-500/5 border border-green-500/10">
                                    <span className="text-[11px] font-black text-green-600">₹{pNet.toLocaleString('en-IN')}</span>
                                  </div>
                                </td>
                                <td className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => handleEditPaymentStart(payment)} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit Entry"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => handleRemovePayment(payment.id)} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Entry"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={9} className="px-6 py-24 text-center text-xs font-black uppercase opacity-20 tracking-widest">No payment records found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-500/5 border border-green-500/10 px-3 py-1.5 rounded-full self-start sm:self-auto shadow-sm">

                  </div>
                  <Button
                    onClick={handleGlobalSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto min-w-[240px] font-black uppercase tracking-widest py-5 px-6 rounded-2xl text-[10px] bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 border-none h-auto hover:-translate-y-[1px] active:translate-y-[1px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-3.5 w-3.5" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* 5. Activity Feed Section */}
            <div className="pt-10 space-y-6">
              <ActivityFeed workId={id} />
            </div>

          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}