import { useNavigate } from 'react-router-dom';
import { Trash2, ChevronRight, Eye, Pencil, Building2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { ThirdPartyWork, ThirdPartyTransaction } from '@/types/thirdParty';

interface WorkLedgerTableProps {
  works: ThirdPartyWork[];
  transactions: ThirdPartyTransaction[];
  onDeleteWork: (workId: string) => void;
  onEditWork: (work: ThirdPartyWork) => void;
  isLoading?: boolean;
}

export function WorkLedgerTable({
  works,
  transactions,
  onDeleteWork,
  onEditWork,
  isLoading,
}: WorkLedgerTableProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleRowClick = (workId: string) => {
    navigate(`/third-party/work/${workId}`);
  };

  if (works.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
        <p className="text-muted-foreground">No work orders assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 text-xs uppercase tracking-wider">
            <TableHead className="w-[120px]">UBQn</TableHead>
            <TableHead>Work Details</TableHead>
            <TableHead className="text-right w-[120px]">Sanctioned</TableHead>
            <TableHead className="text-right w-[120px]">Total Paid</TableHead>

            {/* Unified spacing for balance columns */}
            <TableHead className="text-right text-slate-500 w-[140px]">Total Balance</TableHead>
            <TableHead className="text-right text-blue-600 w-[140px]">Current Balance</TableHead>

            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {works.map((work) => {
            // --- CALCULATION ENGINE ---
            const workTx = transactions.filter((t) => t.work_id === work.id);
            const totalPaid = workTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
            const sanctioned = Number(work.sanction_amount || 0);

            // 1. Total Balance Calculation (Global Liability)
            const totalBalance = sanctioned - totalPaid;

            // 2. Current Balance Calculation (Stage-based Due)
            let activeStage = 1;
            if (totalPaid >= sanctioned * 0.75) activeStage = 4;
            else if (totalPaid >= sanctioned * 0.5) activeStage = 3;
            else if (totalPaid >= sanctioned * 0.25) activeStage = 2;

            const targetForActiveStage = sanctioned * 0.25 * activeStage;
            const currentBalance = targetForActiveStage - totalPaid;

            return (
              <TableRow
                key={work.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleRowClick(work.id)}
              >
                <TableCell className="font-mono text-xs text-blue-600 font-bold">
                  {work.qt_no}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-sm text-slate-800">{work.work_name}</span>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-tight">
                        {work.client_name || (work as any).client || 'No Client'}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatCurrency(sanctioned)}
                </TableCell>
                <TableCell className="text-right text-sm text-slate-500">
                  {formatCurrency(totalPaid)}
                </TableCell>

                {/* Total Balance Cell */}
                <TableCell className="text-right font-medium text-slate-500 text-sm">
                  {formatCurrency(totalBalance)}
                </TableCell>

                {/* Current Balance Cell (View 3 Logic) */}
                <TableCell
                  className={`text-right font-bold text-sm ${currentBalance > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                >
                  <div className="flex flex-col items-end">
                    <span>{formatCurrency(Math.abs(currentBalance))}</span>
                    <span className="text-[9px] uppercase tracking-tighter opacity-70">
                      {currentBalance > 0 ? 'Due' : 'Advance'}
                    </span>
                  </div>
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => handleRowClick(work.id)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditWork(work);
                      }}
                      title="Edit Work"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}