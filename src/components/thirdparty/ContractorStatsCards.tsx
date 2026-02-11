import { Card, CardContent } from '@/components/ui/card';
import { ThirdPartyWork, ThirdPartyTransaction } from '@/types/thirdParty';

interface ContractorStatsCardsProps {
  works: ThirdPartyWork[];
  transactions?: Array<ThirdPartyTransaction & { amount: number | string }>;
}

export function ContractorStatsCards({
  works = [],
  transactions = [],
}: ContractorStatsCardsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  // 1. Basic Totals
  const totalSanctioned = works.reduce((sum, w) => sum + Number(w.sanction_amount || 0), 0);
  const totalPaid = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // 2. VIEW 3 LOGIC APPLIED TO VIEW 2 (Aggregate Stage Math)
  // We calculate what is required for the "Active Stage" of every work order
  const totalCurrentRequired = works.reduce((totalReq, work) => {
    const sanctioned = Number(work.sanction_amount || 0);
    const workTx = transactions.filter((t) => t.work_id === work.id);
    const paidForThisWork = workTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Determine the active stage (1-4) for this specific work order
    let activeStage = 1;
    if (paidForThisWork >= sanctioned * 0.75) activeStage = 4;
    else if (paidForThisWork >= sanctioned * 0.50) activeStage = 3;
    else if (paidForThisWork >= sanctioned * 0.25) activeStage = 2;

    // Add the 25% * activeStage requirement for this work
    return totalReq + (sanctioned * 0.25 * activeStage);
  }, 0);

  // Calculate the gap between what is required for current stages and what was actually paid
  const currentBalanceDue = Math.max(0, totalCurrentRequired - totalPaid);
  const globalPending = Math.max(0, totalSanctioned - totalPaid);
  const globalAdvance = Math.max(0, totalPaid - totalSanctioned);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Sanctioned */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6 text-center">
          <p className="text-sm font-medium text-blue-600 uppercase">Total Sanctioned</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">
            {formatCurrency(totalSanctioned)}
          </p>
        </CardContent>
      </Card>

      {/* Total Paid */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6 text-center">
          <p className="text-sm font-medium text-green-600 uppercase">Total Paid</p>
          <p className="text-2xl font-bold text-green-700 mt-2">
            {formatCurrency(totalPaid)}
          </p>
        </CardContent>
      </Card>

      {/* Global Pending Amount */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-6 text-center">
          <p className="text-sm font-medium text-slate-600 uppercase">Total Pending</p>
          <p className="text-2xl font-bold text-slate-700 mt-2">
            {formatCurrency(globalPending)}
          </p>
        </CardContent>
      </Card>

      {/* Current Balance (The View 3 Logic Card) */}
      <Card 
        className={currentBalanceDue > 0 
          ? "border-orange-200 bg-orange-50" 
          : "border-emerald-200 bg-emerald-50"
        }
      >
        <CardContent className="pt-6 text-center">
          <p className={`text-sm font-medium uppercase ${currentBalanceDue > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
            {currentBalanceDue > 0 ? 'Current Balance' : 'Advance / Credit'}
          </p>
          <p className={`text-2xl font-bold mt-2 ${currentBalanceDue > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
            {currentBalanceDue > 0 
              ? `₹+${currentBalanceDue.toLocaleString('en-IN')}`
              : `₹-${globalAdvance.toLocaleString('en-IN')}`
            }
          </p>
          {currentBalanceDue > 0 && (
            <p className="text-[10px] text-orange-500 font-bold mt-1 uppercase tracking-tighter">
              Due for Active Stages
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}