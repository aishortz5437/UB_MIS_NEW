import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import type { Work, Division } from '@/types/database';
import {
    IndianRupee,
    TrendingDown,
    TrendingUp,
    Receipt,
    PiggyBank,
    AlertCircle,
    CheckCircle2,
    CalendarDays,
    ArrowLeft
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Label
} from 'recharts';
import { DeductionDetailModal } from '@/components/finance/DeductionDetailModal';

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899'];

export default function FinancialDivisionView() {
    const { sectorId, divisionId } = useParams<{ sectorId: string, divisionId: string }>();
    const navigate = useNavigate();

    // Decoding components
    const selectedSector = sectorId ? decodeURIComponent(sectorId) : null;
    const selectedDivision = divisionId ? decodeURIComponent(divisionId) : null;

    const [works, setWorks] = useState<Work[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFY, setSelectedFY] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'billed' | 'unbilled'>('billed');
    const [selectedDeduction, setSelectedDeduction] = useState<'GST' | 'IT' | 'LC' | 'SD' | null>(null);

    useEffect(() => {
        if (!selectedSector || !selectedDivision) {
            navigate('/finance');
            return;
        }

        async function fetchData() {
            const [worksRes, divisionsRes] = await Promise.all([
                supabase
                    .from('works')
                    .select('*, division:divisions(*)')
                    .order('created_at', { ascending: false }),
                supabase.from('divisions').select('*'),
            ]);

            if (worksRes.data) setWorks((worksRes.data as unknown) as Work[]);
            if (divisionsRes.data) setDivisions(divisionsRes.data);
            setLoading(false);
        }
        fetchData();
    }, [selectedSector, selectedDivision, navigate]);

    const availableFYs = useMemo(() => {
        const fys = new Set<string>();
        works.forEach(w => {
            const dateInput = w.financial_date || w.financial_data?.date || w.created_at;
            if (!dateInput) return;
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) return;

            let year = date.getFullYear();
            let month = date.getMonth(); // 0-based
            if (month < 3) year -= 1;
            const nextYear = year + 1;

            fys.add(`FY ${year.toString().slice(-2)}-${nextYear.toString().slice(-2)}`);
        });
        return Array.from(fys).sort().reverse();
    }, [works]);

    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalCompletedAmount = 0;
        let totalBilled = 0;
        let totalGST = 0;
        let totalIT = 0;
        let totalLC = 0;
        let totalSD = 0;

        const fyFilteredWorks = works.filter(w => {
            if (selectedFY === 'all') return true;
            const dateInput = w.financial_date || w.financial_data?.date || w.created_at;
            if (!dateInput) return false;
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) return false;

            let year = date.getFullYear();
            let month = date.getMonth();
            if (month < 3) year -= 1;
            const nextYear = year + 1;
            const fy = `FY ${year.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;

            return fy === selectedFY;
        });

        const divisionFilteredWorks = fyFilteredWorks.filter(w =>
            (w.division?.code === selectedSector || w.division?.name === selectedSector) &&
            ((w.client_name || 'Other') === selectedDivision)
        );

        divisionFilteredWorks.forEach((w) => {
            totalRevenue += Number(w.consultancy_cost) || 0;
            if (w.status.startsWith('Completed')) {
                totalCompletedAmount += Number(w.consultancy_cost) || 0;
            }
            if (w.financial_data?.amount) {
                totalBilled += Number(w.financial_data.amount);
            }
            if (w.financial_data?.payments && w.financial_data.payments.length > 0) {
                w.financial_data.payments.forEach((p: any) => {
                    const pd = p.deductions;
                    if (pd) {
                        totalGST += Number(pd.gst) || 0;
                        totalIT += Number(pd.it) || 0;
                        totalLC += Number(pd.lc) || 0;
                        totalSD += Number(pd.sd) || 0;
                    }
                });
            }
            if (w.financial_data?.deductions) {
                totalGST += Number(w.financial_data.deductions.gst) || 0;
                totalIT += Number(w.financial_data.deductions.it) || 0;
                totalLC += Number(w.financial_data.deductions.lc) || 0;
                totalSD += Number(w.financial_data.deductions.sd) || 0;
            }
        });

        const totalOutstanding = totalCompletedAmount - totalBilled;
        const totalDeductions = totalGST + totalIT + totalLC + totalSD;

        const format = (val: number) =>
            new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
            }).format(val);

        // Billed works (sorted by amount)
        const recentBillings = [...divisionFilteredWorks]
            .filter((w) => Number(w.financial_data?.amount || 0) > 0)
            .sort((a, b) => Number(b.financial_data?.amount) - Number(a.financial_data?.amount));

        const unbilledWorks = [...divisionFilteredWorks]
            .filter((w) => w.status.startsWith('Completed') && Number(w.financial_data?.amount || 0) === 0)
            .sort((a, b) => Number(b.consultancy_cost || 0) - Number(a.consultancy_cost || 0));

        // Calculate Totals for tables
        let billedTableTotalRevenue = 0;
        let billedTableTotalBilled = 0;
        recentBillings.forEach(w => {
            billedTableTotalRevenue += Number(w.consultancy_cost || 0);
            billedTableTotalBilled += Number(w.financial_data?.amount || 0);
        });

        let unbilledTableTotalRevenue = 0;
        unbilledWorks.forEach(w => {
            unbilledTableTotalRevenue += Number(w.consultancy_cost || 0);
        });

        return {
            raw: { totalRevenue, totalCompletedAmount, totalBilled, totalOutstanding, totalDeductions, totalGST, totalIT, totalLC, totalSD },
            formatted: {
                totalRevenue: format(totalRevenue),
                totalCompletedAmount: format(totalCompletedAmount),
                totalBilled: format(totalBilled),
                totalOutstanding: format(totalOutstanding < 0 ? 0 : totalOutstanding),
                totalDeductions: format(totalDeductions),
                totalGST: format(totalGST),
                totalIT: format(totalIT),
                totalLC: format(totalLC),
                totalSD: format(totalSD),
            },
            recentBillings,
            unbilledWorks,
            billedTotalRev: billedTableTotalRevenue,
            billedTotalBilled: billedTableTotalBilled,
            unbilledTotalRev: unbilledTableTotalRevenue,
            divisionFilteredWorks
        };
    }, [works, selectedFY, selectedSector, selectedDivision]);

    if (loading) {
        return (
            <AppLayout>
                <div className="page-shell space-y-8">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-[140px] w-full rounded-2xl" />
                        <Skeleton className="h-[140px] w-full rounded-2xl" />
                        <Skeleton className="h-[140px] w-full rounded-2xl" />
                        <Skeleton className="h-[140px] w-full rounded-2xl" />
                    </div>
                    <Skeleton className="h-[400px] w-full rounded-2xl" />
                </div>
            </AppLayout>
        );
    }

    // Pie Chart data for deductions
    const deductionsData = [
        { name: 'GST', value: stats.raw.totalGST },
        { name: 'IT', value: stats.raw.totalIT },
        { name: 'LC', value: stats.raw.totalLC },
        { name: 'SD', value: stats.raw.totalSD },
    ].filter(d => d.value > 0);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(val);

    return (
        <AppLayout>
            <PageTransition>
                <div className="page-shell space-y-8">
                    {/* Header */}
                    <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <button
                                    onClick={() => navigate(`/finance/${sectorId}`)}
                                    className="hover:text-foreground transition-colors font-medium flex items-center gap-1"
                                >
                                    <ArrowLeft className="h-4 w-4" /> {selectedSector}
                                </button>
                                <span>/</span>
                                <span className="font-bold text-primary">{selectedDivision}</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3 font-heading">
                                {selectedDivision} Financial Analysis
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Detailed breakdown for {selectedDivision} in {selectedSector}.
                            </p>
                        </div>

                        {/* Financial Year Filter */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border border-border/50">
                                <div className="flex items-center gap-2 pl-3 text-muted-foreground">
                                    <CalendarDays className="h-4 w-4" />
                                    <span className="text-sm font-medium hidden sm:inline-block">Financial Year:</span>
                                </div>
                                <Select value={selectedFY} onValueChange={setSelectedFY}>
                                    <SelectTrigger className="w-[120px] sm:w-[140px] bg-background border-none shadow-sm rounded-lg font-medium">
                                        <SelectValue placeholder="All Time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Time</SelectItem>
                                        {availableFYs.map(fy => (
                                            <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Top KPI Cards */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {/* Total Revenue */}
                        <div className="rounded-2xl border bg-gradient-to-br from-card to-card/30 p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1 border-primary/10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-125 duration-500" />
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center">
                                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20">
                                        <IndianRupee className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Total Revenue</h3>
                                    <p className="text-xl xl:text-2xl font-black text-foreground tracking-tighter font-heading whitespace-nowrap">
                                        {stats.formatted.totalRevenue}
                                    </p>
                                </div>
                                <div className="pt-2 flex items-center gap-1.5">
                                    <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-full opacity-30" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Completed Work */}
                        <div className="rounded-2xl border bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/10 dark:to-background p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1 border-blue-200/50 dark:border-blue-900/50">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-125 duration-500" />
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center">
                                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700/70 dark:text-blue-400/70">Completed Work</h3>
                                    <p className="text-xl xl:text-2xl font-black text-blue-700 dark:text-blue-400 tracking-tighter font-heading whitespace-nowrap">
                                        {stats.formatted.totalCompletedAmount}
                                    </p>
                                </div>
                                <div className="pt-2 flex items-center gap-1.5">
                                    <div className="h-1.5 flex-1 bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                            style={{ width: `${Math.min(100, (stats.raw.totalCompletedAmount / (stats.raw.totalRevenue || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Total Billed */}
                        <div className="rounded-2xl border bg-gradient-to-br from-green-50/50 to-white dark:from-green-950/10 dark:to-background p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1 border-green-200/50 dark:border-green-900/50">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-125 duration-500" />
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center">
                                    <div className="p-2.5 bg-green-500/10 rounded-xl text-green-600 dark:text-green-400 ring-1 ring-green-500/20">
                                        <Receipt className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-green-700/70 dark:text-green-400/70">Received Amount</h3>
                                    <p className="text-xl xl:text-2xl font-black text-green-700 dark:text-green-400 tracking-tighter whitespace-nowrap">
                                        {stats.formatted.totalBilled}
                                    </p>
                                </div>
                                <div className="pt-2 flex items-center gap-1.5">
                                    <div className="h-1.5 flex-1 bg-green-100 dark:bg-green-950 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                                            style={{ width: `${Math.min(100, (stats.raw.totalBilled / (stats.raw.totalCompletedAmount || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pending Amount */}
                        <div className="rounded-2xl border bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/10 dark:to-background p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1 border-orange-200/50 dark:border-orange-900/50">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-125 duration-500" />
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center">
                                    <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/20">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-orange-700/70 dark:text-orange-400/70">Pending Amount</h3>
                                    <p className="text-xl xl:text-2xl font-black text-orange-700 dark:text-orange-400 tracking-tighter whitespace-nowrap">
                                        {stats.formatted.totalOutstanding}
                                    </p>
                                </div>
                                <div className="pt-2 flex items-center gap-1.5">
                                    <div className="h-1.5 flex-1 bg-orange-100 dark:bg-orange-950 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-500 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                                            style={{ width: `${Math.min(100, (stats.raw.totalOutstanding / (stats.raw.totalCompletedAmount || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Total Deductions */}
                        <div className="rounded-2xl border bg-gradient-to-br from-red-50/50 to-white dark:from-red-950/10 dark:to-background p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1 border-red-200/50 dark:border-red-900/50">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-125 duration-500" />
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center">
                                    <div className="p-2.5 bg-red-500/10 rounded-xl text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
                                        <TrendingDown className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-red-700/70 dark:text-red-400/70">Total Deductions</h3>
                                    <p className="text-xl xl:text-2xl font-black text-red-700 dark:text-red-400 tracking-tighter whitespace-nowrap">
                                        {stats.formatted.totalDeductions}
                                    </p>
                                </div>
                                <div className="pt-2 flex items-center gap-1.5">
                                    <div className="h-1.5 flex-1 bg-red-100 dark:bg-red-950 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                            style={{ width: `${Math.min(100, (stats.raw.totalDeductions / (stats.raw.totalBilled || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'billed' | 'unbilled')} className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="billed" className="font-semibold px-4">Received Data</TabsTrigger>
                            <TabsTrigger value="unbilled" className="font-semibold px-4">Unbilled (Completed)</TabsTrigger>
                        </TabsList>

                        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">

                            {/* Billed View Deductions Pie Chart - Only visible in Billed Mode */}
                            {viewMode === 'billed' && (
                                <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col order-first lg:order-none lg:col-span-1">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
                                        Deductions Breakdown
                                    </h3>
                                    <div className="flex-1 min-h-[250px] relative flex items-center justify-center">
                                        {deductionsData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={deductionsData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={70}
                                                        outerRadius={90}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {deductionsData.map((entry, index) => (
                                                            <Cell 
                                                                key={`cell-${index}`} 
                                                                fill={COLORS[index % COLORS.length]} 
                                                                onClick={() => setSelectedDeduction(entry.name as any)}
                                                                className="cursor-pointer hover:opacity-80 transition-opacity outline-none"
                                                            />
                                                        ))}
                                                        <Label
                                                            value={stats.formatted.totalDeductions}
                                                            position="center"
                                                            className="text-lg font-black fill-foreground"
                                                        />
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value: number) => formatCurrency(value)}
                                                        contentStyle={{ borderRadius: '12px', borderColor: 'hsl(var(--border))' }}
                                                    />
                                                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="text-center text-muted-foreground">
                                                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm">No deduction data available</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Deduction Stats */}
                                    {deductionsData.length > 0 && (
                                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                                            <div 
                                                className="p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors border border-transparent hover:border-border"
                                                onClick={() => setSelectedDeduction('GST')}
                                            >
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">GST</p>
                                                <p className="text-sm font-black">{stats.formatted.totalGST}</p>
                                            </div>
                                            <div 
                                                className="p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors border border-transparent hover:border-border"
                                                onClick={() => setSelectedDeduction('IT')}
                                            >
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Income Tax</p>
                                                <p className="text-sm font-black">{stats.formatted.totalIT}</p>
                                            </div>
                                            <div 
                                                className="p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors border border-transparent hover:border-border"
                                                onClick={() => setSelectedDeduction('LC')}
                                            >
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Labour Cess</p>
                                                <p className="text-sm font-black">{stats.formatted.totalLC}</p>
                                            </div>
                                            <div 
                                                className="p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors border border-transparent hover:border-border"
                                                onClick={() => setSelectedDeduction('SD')}
                                            >
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Sec. Deposit</p>
                                                <p className="text-sm font-black">{stats.formatted.totalSD}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tables Container */}
                            <div className={`rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col order-last lg:order-none ${viewMode === 'billed' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                                <TabsContent value="billed" className="h-full m-0 flex flex-col pt-0 outline-none">
                                    <div className="p-6 border-b border-border">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <PiggyBank className="h-4 w-4" /> Billed Items List
                                        </h3>
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        {stats.recentBillings.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                                                        <tr>
                                                            <th className="px-6 py-4 font-bold">UBQN | Work</th>
                                                            <th className="px-6 py-4 font-bold text-right">Revenue</th>
                                                            <th className="px-6 py-4 font-bold text-right text-green-600">Received Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border text-xs">
                                                        {stats.recentBillings.map((work) => (
                                                            <tr 
                                                                key={work.id} 
                                                                className="hover:bg-muted/30 transition-colors group cursor-pointer"
                                                                onClick={() => navigate(`/works/${work.id}`)}
                                                            >
                                                                <td className="px-6 py-4 max-w-[200px]">
                                                                    <p className="font-bold">{work.ubqn}</p>
                                                                    <p className="text-muted-foreground truncate group-hover:whitespace-normal group-hover:break-words transition-all duration-300">
                                                                        {work.work_name}
                                                                    </p>
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-medium">
                                                                    {formatCurrency(work.consultancy_cost || 0)}
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-black text-green-600">
                                                                    {formatCurrency(work.financial_data?.amount || 0)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-muted lg:sticky lg:bottom-0 font-bold border-t-2 border-border/80 text-xs">
                                                        <tr>
                                                            <td className="px-6 py-4 text-right text-muted-foreground uppercase tracking-wider font-extrabold text-[10px]">Total</td>
                                                            <td className="px-6 py-4 text-right">{formatCurrency(stats.billedTotalRev)}</td>
                                                            <td className="px-6 py-4 text-right text-green-600 font-extrabold">{formatCurrency(stats.billedTotalBilled)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="p-12 pl-6 flex flex-col items-center justify-center text-muted-foreground h-full">
                                                <Receipt className="h-12 w-12 mb-4 opacity-20" />
                                                <p>No billed data found.</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="unbilled" className="h-full m-0 flex flex-col pt-0 outline-none">
                                    <div className="p-6 border-b border-border">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" /> Unbilled Completed Items List
                                        </h3>
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        {stats.unbilledWorks.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                                                        <tr>
                                                            <th className="px-6 py-4 font-bold">UBQN | Work</th>
                                                            <th className="px-6 py-4 font-bold text-right">Revenue</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border text-xs">
                                                        {stats.unbilledWorks.map((work) => (
                                                            <tr 
                                                                key={work.id} 
                                                                className="hover:bg-muted/30 transition-colors group cursor-pointer"
                                                                onClick={() => navigate(`/works/${work.id}`)}
                                                            >
                                                                <td className="px-6 py-4 max-w-[250px]">
                                                                    <p className="font-bold">{work.ubqn}</p>
                                                                    <p className="text-muted-foreground truncate group-hover:whitespace-normal group-hover:break-words transition-all duration-300">
                                                                        {work.work_name}
                                                                    </p>
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-medium">
                                                                    {formatCurrency(work.consultancy_cost || 0)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-muted lg:sticky lg:bottom-0 font-bold border-t-2 border-border/80 text-xs">
                                                        <tr>
                                                            <td className="px-6 py-4 text-right text-muted-foreground uppercase tracking-wider font-extrabold text-[10px]">Total</td>
                                                            <td className="px-6 py-4 text-right">{formatCurrency(stats.unbilledTotalRev)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="p-12 pl-6 flex flex-col items-center justify-center text-muted-foreground h-full">
                                                <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
                                                <p>All completed works have been billed.</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </div>
                        </div>
                    </Tabs>

                    <DeductionDetailModal 
                        isOpen={!!selectedDeduction}
                        onClose={() => setSelectedDeduction(null)}
                        deductionType={selectedDeduction}
                        works={stats.divisionFilteredWorks}
                    />
                </div>
            </PageTransition>
        </AppLayout>
    );
}
