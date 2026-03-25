import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import type { Work, Division } from '@/types/database';
import {
    IndianRupee,
    TrendingUp,
    Landmark,
    Receipt,
    PiggyBank,
    AlertCircle,
    CheckCircle2,
    CalendarDays
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899'];

export default function FinancialDashboard() {
    const [works, setWorks] = useState<Work[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFY, setSelectedFY] = useState<string>('all');
    const navigate = useNavigate();

    useEffect(() => {
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
    }, []);

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

        // Sector-wise data uses only FY filter
        const divisionData = divisions.map((d) => {
            const dWorks = fyFilteredWorks.filter((w) => w.division_id === d.id);
            const rev = dWorks.reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);
            const comp = dWorks.reduce((sum, w) => sum + (w.status === 'Completed' ? (Number(w.consultancy_cost) || 0) : 0), 0);
            const billed = dWorks.reduce((sum, w) => sum + (Number(w.financial_data?.amount) || 0), 0);
            return {
                name: d.code,
                Revenue: rev,
                Completed: comp,
                Billed: billed,
                Outstanding: comp - billed
            };
        }).filter(d => d.Revenue > 0);

        // Division-wise global data (client_name)
        const globalDivisionWiseDataMap = new Map<string, {Revenue: number, Completed: number, Billed: number}>();
        fyFilteredWorks.forEach((w) => {
            const divName = w.client_name || 'Other';
            const current = globalDivisionWiseDataMap.get(divName) || { Revenue: 0, Completed: 0, Billed: 0 };
            current.Revenue += (Number(w.consultancy_cost) || 0);
            if (w.status === 'Completed') {
                current.Completed += (Number(w.consultancy_cost) || 0);
            }
            current.Billed += (Number(w.financial_data?.amount) || 0);
            globalDivisionWiseDataMap.set(divName, current);
        });
        const globalDivisionWiseData = Array.from(globalDivisionWiseDataMap, ([name, data]) => ({ 
            name, 
            Revenue: data.Revenue, 
            Completed: data.Completed, 
            Billed: data.Billed, 
            Outstanding: data.Completed - data.Billed 
        }))
        .filter(d => d.Revenue > 0)
        .sort((a, b) => b.Revenue - a.Revenue);

        fyFilteredWorks.forEach((w) => {
            totalRevenue += Number(w.consultancy_cost) || 0;
            if (w.status === 'Completed') {
                totalCompletedAmount += Number(w.consultancy_cost) || 0;
            }
            if (w.financial_data?.amount) {
                totalBilled += Number(w.financial_data.amount);
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
        const recentBillings = [...fyFilteredWorks]
            .filter((w) => w.financial_data?.amount)
            .sort((a, b) => Number(b.financial_data?.amount) - Number(a.financial_data?.amount))
            .slice(0, 10);

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
            divisionData,
            globalDivisionWiseData,
            recentBillings
        };
    }, [works, divisions, selectedFY]);

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

    return (
        <AppLayout>
            <PageTransition>
                <div className="page-shell space-y-8">
                    {/* Header */}
                    <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 font-heading">
                                <Landmark className="h-8 w-8 text-primary" />
                                Financial Analysis
                            </h1>
                            <p className="text-sm text-muted-foreground ml-11">
                                Comprehensive overview of company revenue, billings, and outstandings.
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
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                                            style={{ width: `${Math.min(100, (stats.raw.totalCompletedAmount / stats.raw.totalRevenue) * 100)}%` }}
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
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-green-700/70 dark:text-green-400/70">Total Billed</h3>
                                    <p className="text-xl xl:text-2xl font-black text-green-700 dark:text-green-400 tracking-tighter whitespace-nowrap">
                                        {stats.formatted.totalBilled}
                                    </p>
                                </div>
                                <div className="pt-2 flex items-center gap-1.5">
                                    <div className="h-1.5 flex-1 bg-green-100 dark:bg-green-950 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                                            style={{ width: `${Math.min(100, (stats.raw.totalBilled / stats.raw.totalCompletedAmount) * 100)}%` }}
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
                                            style={{ width: `${Math.min(100, (stats.raw.totalOutstanding / stats.raw.totalCompletedAmount) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Charts Section */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Division Revenue vs Billed Bar Chart */}
                        <div className="lg:col-span-2 rounded-2xl border bg-card p-6 shadow-sm">
                            <div className="flex flex-col space-y-4 mb-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                        UB Sector-wise Financials
                                    </h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        className="h-8 text-[10px] font-bold uppercase tracking-wider"
                                        onClick={() => navigate('/finance')}
                                    >
                                        All Sector Page
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 text-[10px] font-bold uppercase tracking-wider"
                                        onClick={() => navigate('/finance/divisions')}
                                    >
                                        Division Wise
                                    </Button>
                                    {stats.divisionData.map((d) => (
                                        <Button 
                                            key={d.name}
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 text-[10px] font-bold uppercase tracking-wider border border-border/50 hover:bg-muted"
                                            onClick={() => navigate(`/finance/${encodeURIComponent(d.name)}`)}
                                        >
                                            {d.name} Details
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.divisionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                        <YAxis
                                            tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                                            formatter={(value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar
                                            dataKey="Revenue"
                                            fill="hsl(142.1 76.2% 36.3%)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="Completed"
                                            fill="hsl(217.2 91.2% 59.8%)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="Billed"
                                            fill="hsl(47.9 95.8% 53.1%)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Deductions Breakdown */}
                        <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
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
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {deductionsData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)}
                                                contentStyle={{ borderRadius: '12px', borderColor: 'hsl(var(--border))' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
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
                                    <div className="p-3 bg-muted/50 rounded-xl">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">GST</p>
                                        <p className="text-sm font-black">{stats.formatted.totalGST}</p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-xl">
                                        <p className="text-sm font-black">{stats.formatted.totalIT}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Billings List */}
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <PiggyBank className="h-4 w-4" /> Top Recent Billings
                            </h3>
                        </div>
                        {stats.recentBillings.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">UBQN | Work Name</th>
                                            <th className="px-6 py-4 font-bold">Client</th>
                                            <th className="px-6 py-4 font-bold text-right">Revenue</th>
                                            <th className="px-6 py-4 font-bold text-right text-green-600">Billed Amount</th>
                                            <th className="px-6 py-4 font-bold text-right text-red-600">Deductions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {stats.recentBillings.map((work) => {
                                            const d = work.financial_data?.deductions;
                                            const dedTotal = d ? (Number(d.gst) || 0) + (Number(d.it) || 0) + (Number(d.lc) || 0) + (Number(d.sd) || 0) : 0;
                                            return (
                                                <tr 
                                                    key={work.id} 
                                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                                    onClick={() => navigate(`/works/${work.id}`)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-xs">{work.ubqn}</p>
                                                        <p className="text-muted-foreground truncate max-w-[300px]" title={work.work_name}>{work.work_name}</p>
                                                    </td>
                                                    <td className="px-6 py-4 truncate max-w-[200px]" title={work.client_name || ''}>
                                                        {work.client_name || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-medium">
                                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(work.consultancy_cost || 0)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-green-600">
                                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(work.financial_data?.amount || 0)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-medium text-red-600">
                                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(dedTotal)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 pl-6 flex flex-col items-center justify-center text-muted-foreground">
                                <Receipt className="h-12 w-12 mb-4 opacity-20" />
                                <p>No billing data found yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </PageTransition>
        </AppLayout>
    );
}
