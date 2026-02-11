import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ThirdPartyTransaction } from '@/types/thirdParty';

interface TransactionHistoryTableProps {
  transactions: ThirdPartyTransaction[];
}

export function TransactionHistoryTable({
  transactions,
}: TransactionHistoryTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
        <p className="text-muted-foreground">No payments recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Date</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Payment Mode</TableHead>
            <TableHead>Transaction Ref</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">
                {format(new Date(transaction.payment_date), 'dd MMM yyyy')}
              </TableCell>
              <TableCell>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                  {transaction.stage_name}
                </span>
              </TableCell>
              <TableCell>{transaction.payment_mode}</TableCell>
              <TableCell className="font-mono text-sm">
                {transaction.transaction_ref || '-'}
              </TableCell>
              <TableCell className="text-right font-bold text-green-600">
                {formatCurrency(Number(transaction.amount))}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate">
                {transaction.remarks || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
