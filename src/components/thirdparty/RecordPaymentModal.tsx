import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

import {
  PaymentMode,
  PaymentFormData,
  ThirdPartyWork,
  ThirdPartyTransaction,
} from '@/types/thirdParty';

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  work: ThirdPartyWork | null;
  transactions: ThirdPartyTransaction[];
  onSubmit: (data: PaymentFormData & { stage: number; amount: number }) => void;
  isLoading?: boolean;
}

const STAGE_NAMES: Record<number, string> = {
  1: 'Mobilisation',
  2: 'Report Submitted',
  3: 'Report Cleared',
  4: 'Payment Cleared',
};

const PAYMENT_MODES: PaymentMode[] = [
  'Cash',
  'GPay',
  'Bank Transfer',
  'Cheque',
];

export function RecordPaymentModal({
  open,
  onOpenChange,
  work,
  transactions,
  onSubmit,
  isLoading,
}: RecordPaymentModalProps) {
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('GPay');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');

  if (!work) return null;

  const sanctionedAmount = Number(work.sanction_amount);
  const stagePercent = 0.25;

  const totalPaid = useMemo(() => {
    return transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );
  }, [transactions]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(v);

  /* ---------------------------------
     CORRECT CURRENT BALANCE LOGIC
  ----------------------------------*/
  const calculation = useMemo(() => {
    if (!selectedStage) return null;

    const inputAmount = Number(amount) || 0;

    const requiredTillStage =
      sanctionedAmount * stagePercent * selectedStage;

    const balanceAfterPayment =
      requiredTillStage - (totalPaid + inputAmount);

    return {
      requiredTillStage,
      totalPaid,
      inputAmount,
      balanceAfterPayment,
      isPending: balanceAfterPayment > 0,
      isAdvance: balanceAfterPayment < 0,
      isSettled: balanceAfterPayment === 0,
    };
  }, [selectedStage, amount, totalPaid, sanctionedAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStage || !amount) return;

    onSubmit({
      stage: selectedStage,
      amount: Number(amount),
      payment_date: format(paymentDate, 'yyyy-MM-dd'),
      payment_mode: paymentMode,
      transaction_ref: transactionRef || null,
      remarks: remarks || null,
    });
  };

  const resetAndClose = (open: boolean) => {
    if (!open) {
      setSelectedStage(null);
      setAmount('');
      setPaymentDate(new Date());
      setPaymentMode('GPay');
      setTransactionRef('');
      setRemarks('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stage */}
          <div className="space-y-2">
            <Label>Select Stage *</Label>
            <Select
              value={selectedStage?.toString()}
              onValueChange={(v) => setSelectedStage(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose stage" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    Stage {s}: {STAGE_NAMES[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage Info */}
          {calculation && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Required Till Stage</span>
                <span className="font-semibold">
                  {formatCurrency(calculation.requiredTillStage)}
                </span>
              </div>

              <div className="flex justify-between text-green-600">
                <span>Paid Till Now</span>
                <span className="font-semibold">
                  {formatCurrency(calculation.totalPaid)}
                </span>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Current Balance */}
          {calculation && amount && (
            <div
              className={cn(
                'rounded-lg border-2 p-4',
                calculation.isAdvance
                  ? 'bg-emerald-50 border-emerald-200'
                  : calculation.isPending
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-blue-50 border-blue-200'
              )}
            >
              <Label className="text-xs uppercase text-muted-foreground">
                Current Balance (Till Selected Stage)
              </Label>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(Math.abs(calculation.balanceAfterPayment))}
              </div>
              <p className="text-sm mt-1">
                {calculation.isAdvance && 'Advance / Carry Forward'}
                {calculation.isSettled && 'Fully Settled'}
                {calculation.isPending && 'Pending Amount'}
              </p>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(paymentDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(d) => d && setPaymentDate(d)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <Select
              value={paymentMode}
              onValueChange={(v) => setPaymentMode(v as PaymentMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ref */}
          <div className="space-y-2">
            <Label>Transaction Ref</Label>
            <Input
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
            />
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => resetAndClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
