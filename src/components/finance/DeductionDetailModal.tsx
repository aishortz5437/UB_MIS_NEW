import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronUp, ArrowUpDown, Receipt } from 'lucide-react';
import type { Work } from '@/types/database';

interface DeductionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    deductionType: 'GST' | 'IT' | 'LC' | 'SD' | null;
    works: Work[];
}

export function DeductionDetailModal({ isOpen, onClose, deductionType, works }: DeductionDetailModalProps) {
    const navigate = useNavigate();
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const getDeductionAmount = (w: Work, type: string) => {
        let amount = 0;
        const key = type.toLowerCase() as 'gst' | 'it' | 'lc' | 'sd';
        
        if (w.financial_data?.payments && w.financial_data.payments.length > 0) {
            amount += w.financial_data.payments.reduce((sum: number, p: any) => {
                return sum + (p.deductions ? (Number(p.deductions[key]) || 0) : 0);
            }, 0);
        }
        if (w.financial_data?.deductions) {
            amount += Number(w.financial_data.deductions[key]) || 0;
        }
        return amount;
    };

    const filteredAndSortedWorks = useMemo(() => {
        if (!deductionType || !works) return [];

        const filtered = works
            .map(w => ({
                ...w,
                deductionAmount: getDeductionAmount(w, deductionType)
            }))
            .filter(w => w.deductionAmount > 0);

        return filtered.sort((a, b) => {
            if (sortOrder === 'desc') {
                return b.deductionAmount - a.deductionAmount;
            }
            return a.deductionAmount - b.deductionAmount;
        });
    }, [works, deductionType, sortOrder]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(val);

    const toggleSort = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    const totalAmount = filteredAndSortedWorks.reduce((sum, w) => sum + w.deductionAmount, 0);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-black">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-lg">
                            {deductionType}
                        </span>
                        Deduction Details
                    </DialogTitle>
                    <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mt-2">
                        <p>{filteredAndSortedWorks.length} active works with {deductionType} deductions</p>
                        <span>•</span>
                        <p className="text-foreground tracking-tight">
                            Total: <span className="font-extrabold text-red-600">{formatCurrency(totalAmount)}</span>
                        </p>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6 pt-2">
                    {filteredAndSortedWorks.length > 0 ? (
                        <div className="border rounded-xl shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[120px] font-bold text-xs uppercase tracking-wider">UBQN</TableHead>
                                        <TableHead className="font-bold text-xs uppercase tracking-wider">Work Name</TableHead>
                                        <TableHead className="w-[150px] font-bold text-xs uppercase tracking-wider">Division</TableHead>
                                        <TableHead 
                                            className="w-[180px] text-right font-bold text-xs uppercase tracking-wider text-red-600 cursor-pointer hover:bg-muted/50 transition-colors group select-none"
                                            onClick={toggleSort}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                {deductionType} Amount
                                                {sortOrder === 'desc' ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-red-600" />
                                                ) : (
                                                    <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-red-600" />
                                                )}
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedWorks.map((work) => (
                                        <TableRow 
                                            key={work.id}
                                            className="cursor-pointer hover:bg-muted/30 transition-colors group"
                                            onClick={() => {
                                                onClose();
                                                navigate(`/works/${work.id}`);
                                            }}
                                        >
                                            <TableCell className="font-mono text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                                {work.ubqn}
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">
                                                <span className="line-clamp-2">
                                                    {work.work_name}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10">
                                                    {work.division?.code || work.client_name || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-red-600 font-mono text-sm">
                                                {formatCurrency(work.deductionAmount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                            <p>No works found with {deductionType} deductions.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
