import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import type { Work, Division } from '@/types/database';
import {
    IndianRupee,
    TrendingDown,
    TrendingUp,
    Landmark,
    Receipt,
    PiggyBank,
    AlertCircle
} from 'lucide-react';
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

    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalBilled = 0;
        let totalGST = 0;
        let totalIT = 0;
        let totalLC = 0;
        let totalSD = 0;

        works.forEach((w) => {
            totalRevenue += Number(w.consultancy_cost) || 0;
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

        const totalOutstanding = totalRevenue - totalBilled;
        const totalDeductions = totalGST + totalIT + totalLC + totalSD;

        const format = (val: number) =>
            new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
            }).format(val);

        // Division wise data for bar chart
        const divisionData = divisions.map((d) => {
            const dWorks = works.filter((w) => w.division_id === d.id);
            const rev = dWorks.reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);
            const billed = dWorks.reduce((sum, w) => sum + (Number(w.financial_data?.amount) || 0), 0);
            return {
                name: d.code,
                Revenue: rev,
                Billed: billed,
                Outstanding: rev - billed
            };
        }).filter(d => d.Revenue > 0);

        // Billed works (sorted by amount)
        const recentBillings = [...works]
            .filter((w) => w.financial_data?.amount)
            .sort((a, b) => Number(b.financial_data?.amount) - Number(a.financial_data?.amount))
            .slice(0, 10);

        return {
            raw: { totalRevenue, totalBilled, totalOutstanding, totalDeductions, totalGST, totalIT, totalLC, totalSD },
            formatted: {
                totalRevenue: format(totalRevenue),
                totalBilled: format(totalBilled),
                totalOutstanding: format(totalOutstanding < 0 ? 0 : totalOutstanding),
                totalDeductions: format(totalDeductions),
                totalGST: format(totalGST),
                totalIT: format(totalIT),
                totalLC: format(totalLC),
                totalSD: format(totalSD),
            },
            divisionData,
            recentBillings
        };
    }, [works, divisions]);

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
                    <div className="page-header">
                        <div className="space-y-0.5">
                            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 font-heading">
                                <Landmark className="h-8 w-8 text-primary" />
                                Financial Analysis
                            </h1>
                            <p className="text-sm text-muted-foreground ml-11">
                                Comprehensive overview of company revenue, billings, and outstandings.
                            </p>
                        </div>
                    </div>

                    {/* Top KPI Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border bg-gradient-to-br from-card to-card/50 p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                            <div className="space-y-2 relative z-10">
                                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <IndianRupee className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest">Total Revenue</h3>
                                </div>
                                <p className="text-3xl font-black text-foreground tracking-tight font-heading">
                                    {stats.formatted.totalRevenue}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                            <div className="space-y-2 relative z-10">
                                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-4">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <Receipt className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest">Total Billed</h3>
                                </div>
                                <p className="text-3xl font-black text-green-700 dark:text-green-400 tracking-tight">
                                    {stats.formatted.totalBilled}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                            <div className="space-y-2 relative z-10">
                                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-4">
                                    <div className="p-2 bg-orange-500/10 rounded-lg">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest">Pending/Outstanding</h3>
                                </div>
                                <p className="text-3xl font-black text-orange-700 dark:text-orange-400 tracking-tight">
                                    {stats.formatted.totalOutstanding}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                            <div className="space-y-2 relative z-10">
                                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-4">
                                    <div className="p-2 bg-red-500/10 rounded-lg">
                                        <TrendingDown className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest">Total Deductions</h3>
                                </div>
                                <p className="text-3xl font-black text-red-700 dark:text-red-400 tracking-tight">
                                    {stats.formatted.totalDeductions}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Division Revenue vs Billed Bar Chart */}
                        <div className="lg:col-span-2 rounded-2xl border bg-card p-6 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
                                UB Sector-wise Financials
                            </h3>
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
                                        <Bar dataKey="Revenue" fill="hsl(142.1 76.2% 36.3%)" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Billed" fill="hsl(217.2 91.2% 59.8%)" radius={[4, 4, 0, 0]} />
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
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Income Tax</p>
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
                                                <tr key={work.id} className="hover:bg-muted/30 transition-colors">
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
