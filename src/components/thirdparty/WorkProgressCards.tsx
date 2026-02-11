import { ThirdPartyWork, ThirdPartyTransaction } from '@/types/thirdParty';
import { Progress } from '@/components/ui/progress';

interface WorkProgressCardsProps {
  work: ThirdPartyWork;
  transactions: ThirdPartyTransaction[];
}

export function WorkProgressCards({
  work,
  transactions,
}: WorkProgressCardsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  const sanctionedAmount = Number(work.sanction_amount);
  const receivedAmount = transactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  // Global Pending (Total Contract - Total Paid)
  const pendingAmount = Math.max(0, sanctionedAmount - receivedAmount);
  
  // Progress %
  const progressPercent =
    sanctionedAmount > 0
      ? (receivedAmount / sanctionedAmount) * 100
      : 0;

  /* ------------------------------------------------------------------
     LOGIC FIX: Calculate Balance based on "Current Active Stage"
     Goal: If paid 1000 (Stage 1), show 1500 Due.
  ------------------------------------------------------------------- */
  const stageValue = sanctionedAmount / 4;
  
  // Determine implied stage (1 to 4) based on payment
  // e.g., Paid 1000 / 2500 = 0.4 -> Floor 0 -> +1 = Stage 1
  let currentStage = Math.floor(receivedAmount / stageValue) + 1;
  if (currentStage > 4) currentStage = 4; 

  // How much should be paid to clear this stage?
  const targetForCurrentStage = currentStage * stageValue;

  // The Gap: (Target) - (Actual Paid)
  // If Positive (+): Amount Due to finish this stage
  // If Negative (-): Advance paid into next stage (shouldn't happen with this math often, but safe to handle)
  const currentStageBalance = targetForCurrentStage - receivedAmount;
  
  // Logic to determine if it's an Advance (Credit) or Due (Debit)
  // Note: If you overpay the WHOLE contract, this becomes negative.
  const isAdvance = currentStageBalance < 0;
  const isSettled = currentStageBalance === 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Quoted */}
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-600">
            Quoted Amount
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-2">
            {formatCurrency(Number(work.quoted_amount))}
          </p>
        </div>

        {/* Sanctioned */}
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-600">
            Sanctioned Amount
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-2">
            {formatCurrency(sanctionedAmount)}
          </p>
        </div>

        {/* Paid */}
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-600">
            Paid Amount
          </p>
          <p className="text-2xl font-bold text-green-700 mt-2">
            {formatCurrency(receivedAmount)}
          </p>
        </div>

        {/* Pending (Global) */}
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-600">
            Pending Amount
          </p>
          <p className="text-2xl font-bold text-orange-700 mt-2">
            ₹+{pendingAmount.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Current Balance (Stage Logic) */}
        <div
          className={`rounded-xl border-2 p-4 ${
            isAdvance
              ? 'border-emerald-200 bg-emerald-50' // Green if Advance
              : isSettled
              ? 'border-blue-200 bg-blue-50'    // Blue if 0
              : 'border-red-200 bg-red-50'      // Red if Due
          }`}
        >
          <p
            className={`text-sm font-medium uppercase tracking-wide ${
              isAdvance
                ? 'text-emerald-600'
                : isSettled
                ? 'text-blue-600'
                : 'text-red-600'
            }`}
          >
            Current Balance
          </p>
          <p
            className={`text-2xl font-bold mt-2 ${
              isAdvance
                ? 'text-emerald-700'
                : isSettled
                ? 'text-blue-700'
                : 'text-red-700'
            }`}
          >
            {isAdvance
              ? `₹${currentStageBalance.toLocaleString('en-IN')}` // Shows negative
              : `₹+${currentStageBalance.toLocaleString('en-IN')}`}
          </p>
          
          {/* Helpful Badge */}
          <p className="text-xs mt-1 font-medium opacity-80">
             {isAdvance && 'Advance Credit'}
             {isSettled && 'Fully Settled'}
             {!isAdvance && !isSettled && `Due for Stage ${currentStage}`}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Payment Progress
          </span>
          <span className="text-sm font-bold text-primary">
            {progressPercent.toFixed(0)}%
          </span>
        </div>

        <Progress value={progressPercent} className="h-3" />

        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{formatCurrency(receivedAmount)} received</span>
          <span>{formatCurrency(pendingAmount)} remaining</span>
        </div>
      </div>
    </div>
  );
}