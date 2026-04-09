import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import type { Work } from '@/types/database';
import {
    Landmark,
    Briefcase,
    IndianRupee,
    Receipt,
    TrendingUp,
    ChevronLeft,
    CheckCircle2,
    Clock,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/works/StatusBadge';

export default function GlobalDivisionDetailView() {
    const { divisionName } = useParams();
    const navigate = useNavigate();
    const [works, setWorks] = useState<Work[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchWorks() {
            if (!divisionName) return;
            
            const { data, error } = await supabase
                .from('works')
                .select('*, division:divisions(*)')
                .eq('client_name', decodeURIComponent(divisionName))
                .order('created_at', { ascending: false });

            if (data) setWorks((data as unknown) as Work[]);
            setLoading(false);
        }
        fetchWorks();
    }, [divisionName]);

    const stats = useMemo(() => {
        const totalRevenue = works.reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);
        const totalBilled = works.reduce((sum, w) => sum + (Number(w.financial_data?.amount) || 0), 0);
        const totalDeductions = works.reduce((sum, w) => {
            let workDeductions = 0;
            if (w.financial_data?.payments && w.financial_data.payments.length > 0) {
                workDeductions += w.financial_data.payments.reduce((pSum: number, p: any) => {
                    const pd = p.deductions;
                    return pSum + (pd ? (Number(pd.gst) || 0) + (Number(pd.it) || 0) + (Number(pd.lc) || 0) + (Number(pd.sd) || 0) : 0);
                }, 0);
            }
            if (w.financial_data?.deductions) {
                const d = w.financial_data.deductions;
                workDeductions += (Number(d.gst) || 0) + (Number(d.it) || 0) + (Number(d.lc) || 0) + (Number(d.sd) || 0);
            }
            return sum + workDeductions;
        }, 0);
        const pendingAmount = totalRevenue - totalBilled;

        const format = (val: number) =>
            new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
            }).format(val);

        return {
            totalRevenue: format(totalRevenue),
            totalBilled: format(totalBilled),
            totalDeductions: format(totalDeductions),
            pendingAmount: format(pendingAmount < 0 ? 0 : pendingAmount),
            count: works.length
        };
    }, [works]);

    if (loading) {
        return (
            <AppLayout>
                <div className="page-shell space-y-8">
                    <Skeleton className="h-10 w-64" />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Skeleton className="h-32 w-full rounded-2xl" />
                        <Skeleton className="h-32 w-full rounded-2xl" />
                        <Skeleton className="h-32 w-full rounded-2xl" />
                        <Skeleton className="h-32 w-full rounded-2xl" />
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <PageTransition>
                <div className="page-shell space-y-8">
                    {/* Header */}
                    <div className="flex flex-col gap-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-fit text-muted-foreground hover:text-foreground"
                            onClick={() => navigate('/finance/divisions')}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to All Divisions
                        </Button>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                                    <Briefcase className="h-9 w-9 text-primary" />
                                    {decodeURIComponent(divisionName || '')}
                                </h1>
                                <p className="text-muted-foreground font-medium">
                                    Portfolio of {stats.count} works across all sectors for this division.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card border rounded-2xl p-5 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Total Revenue</h4>
                            <p className="text-2xl font-black">{stats.totalRevenue}</p>
                        </div>
                        <div className="bg-card border rounded-2xl p-5 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-2">Total Billed</h4>
                            <p className="text-2xl font-black text-green-600">{stats.totalBilled}</p>
                        </div>
                        <div className="bg-card border rounded-2xl p-5 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-2">Deductions</h4>
                            <p className="text-2xl font-black text-red-600">{stats.totalDeductions}</p>
                        </div>
                        <div className="bg-card border rounded-2xl p-5 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-2">Pending</h4>
                            <p className="text-2xl font-black text-orange-600">{stats.pendingAmount}</p>
                        </div>
                    </div>

                    {/* Works Table */}
                    <div className="table-container overflow-x-auto rounded-xl border bg-card shadow-sm mt-8">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
                                    <TableHead className="w-24 px-4 font-bold text-foreground/70 uppercase tracking-wider text-xs">UBQN</TableHead>
                                    <TableHead className="min-w-[250px] font-bold text-foreground/70 uppercase tracking-wider text-xs">Work Name</TableHead>
                                    <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs text-center">Sector</TableHead>
                                    <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Status</TableHead>
                                    <TableHead className="text-right font-bold text-foreground/70 uppercase tracking-wider text-xs">Revenue</TableHead>
                                    <TableHead className="text-right font-bold pr-6 text-foreground/70 uppercase tracking-wider text-xs text-green-600">Billed</TableHead>
                                    <TableHead className="w-24 text-center font-bold text-foreground/70 uppercase tracking-wider text-xs">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {works.map((work) => (
                                    <TableRow 
                                        key={work.id} 
                                        className="group transition-colors hover:bg-muted/30 even:bg-muted/10 border-l-2 border-l-transparent hover:border-l-primary cursor-pointer"
                                        onClick={() => navigate(`/works/${work.id}`)}
                                    >
                                        <TableCell className="px-4 font-mono text-xs font-bold text-muted-foreground">
                                            {work.ubqn}
                                        </TableCell>
                                        <TableCell className="max-w-md py-4">
                                            <span className="line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary group-hover:underline">
                                                {work.work_name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-xs font-bold text-muted-foreground uppercase">
                                                {work.division?.code || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={work.status} pendingR2={work.pending_r2_approval} />
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-black whitespace-nowrap">
                                            ₹{Number(work.consultancy_cost || 0).toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-black pr-6 text-green-600 whitespace-nowrap">
                                            ₹{Number(work.financial_data?.amount || 0).toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </PageTransition>
        </AppLayout>
    );
}
