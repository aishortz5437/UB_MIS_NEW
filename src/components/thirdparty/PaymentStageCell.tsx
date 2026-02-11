import { Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentStageStatus } from '@/types/thirdParty';

interface PaymentStageCellProps {
  status: PaymentStageStatus;
  amount: number;
  onPay: () => void;
  isLoading?: boolean;
}

export function PaymentStageCell({ status, amount, onPay, isLoading }: PaymentStageCellProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (status === 'Locked') {
    return (
      <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg min-h-[80px] border border-gray-200">
        <Lock className="h-5 w-5 text-gray-400 mb-1" />
        <span className="text-xs text-gray-500 font-medium">Locked</span>
        <span className="text-xs text-gray-400">{formatCurrency(amount)}</span>
      </div>
    );
  }

  if (status === 'Due') {
    return (
      <div className="flex flex-col items-center justify-center p-3 bg-blue-50 rounded-lg min-h-[80px] border border-blue-200">
        <span className="text-sm font-semibold text-blue-700 mb-1">{formatCurrency(amount)}</span>
        <Button
          size="sm"
          onClick={onPay}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-7"
        >
          Release Pay
        </Button>
      </div>
    );
  }

  // Paid status
  
}
