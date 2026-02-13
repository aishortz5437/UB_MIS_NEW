import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { WorkProgressCards } from '@/components/thirdparty/WorkProgressCards';
import { TransactionHistoryTable } from '@/components/thirdparty/TransactionHistoryTable';
import { RecordPaymentModal } from '@/components/thirdparty/RecordPaymentModal';
import {
  ThirdPartyWork,
  ThirdPartyTransaction,
  PaymentFormData,
  PaymentMode,
} from '@/types/thirdParty';

const STAGE_NAMES: Record<number, string> = {
  1: 'Mobilisation',
  2: 'Report Submitted to UB',
  3: 'Report Cleared by Client',
  4: 'Payment Cleared by Client',
};

export default function WorkOrderDetail() {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const [work, setWork] = useState<ThirdPartyWork | null>(null);
  const [transactions, setTransactions] = useState<ThirdPartyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const fetchData = async () => {
    if (!workId) return;

    try {
      const { data: workData, error: workError } = await supabase
        .from('third_party_works')
        .select('*')
        .eq('id', workId)
        .single();

      if (workError) throw workError;

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('third_party_transactions')
        .select('*')
        .eq('work_id', workId)
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      setWork({
        ...workData,
        stage1_status: workData.stage1_status as 'Locked' | 'Due' | 'Paid',
        stage2_status: workData.stage2_status as 'Locked' | 'Due' | 'Paid',
        stage3_status: workData.stage3_status as 'Locked' | 'Due' | 'Paid',
        stage4_status: workData.stage4_status as 'Locked' | 'Due' | 'Paid',
      });
      setTransactions(
        (transactionsData || []).map((t) => ({
          ...t,
          payment_mode: t.payment_mode as PaymentMode,
        }))
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Unable to load work order details. Please check your connection and try again.');
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workId]);

  const handleOpenPaymentModal = (stage: number) => {
    setPaymentModalOpen(true);
  };

  const handlePayStage = async (data: PaymentFormData & { stage: number; amount: number }) => {
    if (!work) return;

    setIsSubmitting(true);
    try {
      const { stage, amount } = data;

      // Insert transaction record
      const { error: transactionError } = await supabase
        .from('third_party_transactions')
        .insert({
          work_id: work.id,
          stage_number: stage,
          stage_name: STAGE_NAMES[stage],
          amount: amount,
          payment_date: data.payment_date,
          payment_mode: data.payment_mode,
          transaction_ref: data.transaction_ref || null,
          remarks: data.remarks || null,
        });

      if (transactionError) throw transactionError;

      // Calculate total paid for this stage
      const stageTotalPaid =
        transactions.filter((t) => t.stage_number === stage).reduce((sum, t) => sum + Number(t.amount), 0) +
        amount;

      const stageValue = Number(work.sanction_amount) / 4;

      // Update work stage status if stage is fully paid
      const updates: Record<string, any> = {};
      const stageKey = `stage${stage}_status`;
      const paidAtKey = `stage${stage}_paid_at`;
      const nextStageKey = `stage${stage + 1}_status`;

      if (stageTotalPaid >= stageValue) {
        updates[stageKey] = 'Paid';
        updates[paidAtKey] = new Date().toISOString();

        if (stage < 4) {
          // Check if next stage is still locked
          const nextStatus = work[`stage${stage + 1}_status` as keyof ThirdPartyWork];
          if (nextStatus === 'Locked') {
            updates[nextStageKey] = 'Due';
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('third_party_works')
          .update(updates)
          .eq('id', work.id);

        if (updateError) throw updateError;
      }

      toast.success(`Payment of ₹${amount.toLocaleString('en-IN')} recorded for Stage ${stage}`);
      setPaymentModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Could not record the payment. Please verify the details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="page-shell space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!work) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Work order not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {work.work_name}{' '}
              <span className="text-muted-foreground font-normal">
                ({work.qt_no})
              </span>
            </h1>
            {work.client_name && (
              <p className="text-muted-foreground">{work.client_name}</p>
            )}
          </div>
        </div>

        {/* Financial Progress Cards */}
        <WorkProgressCards work={work} transactions={transactions} />

        {/* Single Record Payment Button */}
        <div className="mt-4">
          <Button
            onClick={() => setPaymentModalOpen(true)}
            className="w-full md:w-auto">
            Record Payment
          </Button>
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
          <TransactionHistoryTable transactions={transactions} />
        </div>
      </div>

      {/* Payment Modal */}
      <RecordPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        work={work}
        transactions={transactions}
        onSubmit={handlePayStage}
        isLoading={isSubmitting}
      />
    </AppLayout>
  );
}
