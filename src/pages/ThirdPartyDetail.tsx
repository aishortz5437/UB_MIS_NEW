import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ContractorStatsCards } from '@/components/thirdparty/ContractorStatsCards';
import { WorkLedgerTable } from '@/components/thirdparty/WorkLedgerTable';
import { AddWorkModal } from '@/components/thirdparty/AddWorkModal';
import { RecordPaymentModal } from '@/components/thirdparty/RecordPaymentModal';
import {
  ThirdPartyContractor,
  ThirdPartyWork,
  ThirdPartyTransaction,
  WorkFormData,
  PaymentFormData,
} from '@/types/thirdParty';

const STAGE_NAMES: Record<number, string> = {
  1: 'Mobilisation',
  2: 'Report Submitted',
  3: 'Report Cleared',
  4: 'Payment Cleared',
};

export default function ThirdPartyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [contractor, setContractor] = useState<ThirdPartyContractor | null>(null);
  const [works, setWorks] = useState<ThirdPartyWork[]>([]);
  const [allTransactions, setAllTransactions] = useState<ThirdPartyTransaction[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddWorkModalOpen, setIsAddWorkModalOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    work: ThirdPartyWork | null;
  }>({ open: false, work: null });

  // --- STATS CALCULATION ---
  const contractorStats = useMemo(() => {
    const totalSanctioned = works.reduce((sum, w) => sum + Number(w.sanction_amount || 0), 0);
    const totalPaid = allTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    let totalRequiredForActiveStages = 0;

    works.forEach(work => {
      const sanctioned = Number(work.sanction_amount || 0);
      const workTx = allTransactions.filter(t => t.work_id === work.id);
      const paidForWork = workTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      let activeStage = 1;
      if (paidForWork >= sanctioned * 0.75) activeStage = 4;
      else if (paidForWork >= sanctioned * 0.50) activeStage = 3;
      else if (paidForWork >= sanctioned * 0.25) activeStage = 2;
      
      totalRequiredForActiveStages += (sanctioned * 0.25 * activeStage);
    });

    const currentBalance = totalRequiredForActiveStages - totalPaid;

    return {
      totalSanctioned,
      totalPaid,
      pendingAmount: totalSanctioned - totalPaid,
      currentBalance: currentBalance
    };
  }, [works, allTransactions]);

  const fetchData = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      const [contractorRes, worksRes] = await Promise.all([
        supabase.from('third_party_contractors').select('*').eq('id', id).single(),
        supabase.from('third_party_works').select('*').eq('contractor_id', id).order('created_at', { ascending: false })
      ]);

      if (contractorRes.error) throw contractorRes.error;
      if (worksRes.error) throw worksRes.error;

      const workIds = (worksRes.data || []).map((w) => w.id);
      let transactionsData: any[] = [];
      
      if (workIds.length > 0) {
        const { data: txData, error: txError } = await supabase
          .from('third_party_transactions')
          .select('*')
          .in('work_id', workIds);
        
        if (txError) throw txError;
        transactionsData = txData || [];
      }

      setContractor(contractorRes.data as any);
      setWorks((worksRes.data || []) as any);
      setAllTransactions(transactionsData as any);

    } catch (error: any) {
      console.error('CRITICAL FETCH ERROR:', error);
      toast.error(error.message || 'Failed to load contractor data');
      navigate('/third-party'); 
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePayStage = async (data: PaymentFormData & { stage: number; amount: number }) => {
    if (!paymentModal.work) return;
    setIsSubmitting(true);
    try {
      const { error: txError } = await supabase
        .from('third_party_transactions')
        .insert({
          work_id: paymentModal.work.id,
          stage_number: data.stage,
          stage_name: STAGE_NAMES[data.stage],
          amount: data.amount,
          payment_date: data.payment_date,
          payment_mode: data.payment_mode,
          transaction_ref: data.transaction_ref,
          remarks: data.remarks,
        });

      if (txError) throw txError;
      toast.success('Payment recorded');
      setPaymentModal({ open: false, work: null });
      fetchData();
    } catch (error) {
      toast.error('Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWork = async (workId: string) => {
    try {
      const { error } = await supabase.from('third_party_works').delete().eq('id', workId);
      if (error) throw error;
      toast.success('Deleted');
      fetchData();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  /**
   * FIXED: Included client_name in the insert payload
   */
  const handleAddWork = async (data: WorkFormData) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('third_party_works').insert({
        contractor_id: id,
        work_name: data.work_name,
        qt_no: data.qt_no,
        client_name: data.client_name, // Fix applied here
        sanction_amount: parseFloat(data.sanction_amount),
        quoted_amount: parseFloat(data.quoted_amount || '0'),
        stage1_status: 'Due',
        stage2_status: 'Due',
        stage3_status: 'Due',
        stage4_status: 'Due',
      });
      
      if (error) throw error;
      
      toast.success('Work order added successfully');
      setIsAddWorkModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Add Work Error:', error);
      toast.error(error.message || 'Failed to add work');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading contractor ledger...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/third-party')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{contractor?.name}</h1>
                <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                  {contractor?.ub_id}
                </span>
              </div>
              <p className="text-muted-foreground">{contractor?.category}</p>
            </div>
          </div>
          <Button onClick={() => setIsAddWorkModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Work
          </Button>
        </div>

        <ContractorStatsCards 
          works={works} 
          transactions={allTransactions}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Work Ledger</h2>
          </div>
          <WorkLedgerTable
            works={works}
            transactions={allTransactions}
            onDeleteWork={handleDeleteWork}
            isLoading={isSubmitting}
          />
        </div>
      </div>

      <AddWorkModal
        open={isAddWorkModalOpen}
        onOpenChange={setIsAddWorkModalOpen}
        onSubmit={handleAddWork}
        isLoading={isSubmitting}
      />

      <RecordPaymentModal
        open={paymentModal.open}
        onOpenChange={(open) => setPaymentModal({ ...paymentModal, open })}
        work={paymentModal.work}
        transactions={allTransactions.filter(t => t.work_id === paymentModal.work?.id)}
        onSubmit={handlePayStage}
        isLoading={isSubmitting}
      />
    </AppLayout>
  );
}
