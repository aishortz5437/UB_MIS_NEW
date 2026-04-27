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
    CalendarDays,
    Briefcase
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

export default function FinancialAllDivisionsView() {
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
            const comp = dWorks.reduce((sum, w) => sum + (w.status.startsWith('Completed') ? (Number(w.consultancy_cost) || 0) : 0), 0);
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
        const globalDivisionWiseDataMap = new Map<string, {Revenue: number, Completed: number, Billed: number, Deductions: number}>();
        fyFilteredWorks.forEach((w) => {
            const divName = w.client_name || 'Other';
            const current = globalDivisionWiseDataMap.get(divName) || { Revenue: 0, Completed: 0, Billed: 0, Deductions: 0 };
            current.Revenue += (Number(w.consultancy_cost) || 0);
            if (w.status.startsWith('Completed')) {
                current.Completed += (Number(w.consultancy_cost) || 0);
            }
            current.Billed += (Number(w.financial_data?.amount) || 0);
            
            if (w.financial_data?.payments && w.financial_data.payments.length > 0) {
                w.financial_data.payments.forEach((p: any) => {
                    const pd = p.deductions;
                    if (pd) {
                        current.Deductions += (Number(pd.gst) || 0) + (Number(pd.it) || 0) + (Number(pd.lc) || 0) + (Number(pd.sd) || 0);
                    }
                });
            }
            if (w.financial_data?.deductions) {
                const d = w.financial_data.deductions;
                current.Deductions += (Number(d.gst) || 0) + (Number(d.it) || 0) + (Number(d.lc) || 0) + (Number(d.sd) || 0);
            }

            globalDivisionWiseDataMap.set(divName, current);
        });
        const globalDivisionWiseData = Array.from(globalDivisionWiseDataMap, ([name, data]) => ({ 
            name, 
            Revenue: data.Revenue, 
            Completed: data.Completed, 
            Billed: data.Billed, 
            Deductions: data.Deductions,
            Outstanding: data.Completed - data.Billed 
        }))
        .filter(d => d.Revenue > 0)
        .sort((a, b) => b.Revenue - a.Revenue);

        fyFilteredWorks.forEach((w) => {
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
                const d = w.financial_data.deductions;
                totalGST += Number(d.gst) || 0;
                totalIT += Number(d.it) || 0;
                totalLC += Number(d.lc) || 0;
                totalSD += Number(d.sd) || 0;
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
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                                <Landmark className="h-9 w-9 text-primary" />
                                Division-wise Financials
                            </h1>
                            <p className="text-muted-foreground font-medium">
                                Breakdown of total revenue and billing aggregated by division/client.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button 
                                variant="outline"
                                onClick={() => navigate('/finance')}
                                className="font-bold uppercase tracking-wider text-xs h-10 px-6"
                            >
                                Back to Dashboard
                            </Button>
                            
                            <div className="h-10 flex items-center gap-2 bg-muted/50 px-4 rounded-xl border">
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                <Select value={selectedFY} onValueChange={setSelectedFY}>
                                    <SelectTrigger className="w-[130px] border-none bg-transparent shadow-none font-bold text-xs ring-0 focus:ring-0">
                                        <SelectValue placeholder="FY" />
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

                    {/* Summary Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <IndianRupee className="h-24 w-24" />
                            </div>
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-1">Total Portfolio</h4>
                            <p className="text-3xl font-black tracking-tighter">{stats.formatted.totalRevenue}</p>
                        </div>
                        <div className="bg-green-500/5 border border-green-500/10 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Receipt className="h-24 w-24" />
                            </div>
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-600/70 mb-1">Received Amount</h4>
                            <p className="text-3xl font-black tracking-tighter text-green-600">{stats.formatted.totalBilled}</p>
                        </div>
                        <div className="bg-orange-500/5 border border-orange-500/10 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp className="h-24 w-24" />
                            </div>
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600/70 mb-1">Total Outstanding</h4>
                            <p className="text-3xl font-black tracking-tighter text-orange-600">{stats.formatted.totalOutstanding}</p>
                        </div>
                    </div>

                    {/* Divisions Detailed List */}
                    <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b flex items-center justify-between bg-muted/30">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-primary" />
                                Division-wise Breakdown
                            </h3>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                {stats.globalDivisionWiseData.length} ACTIVE DIVISIONS
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground border-b">
                                    <tr>
                                        <th className="px-8 py-5 font-bold">Division / Client Name</th>
                                        <th className="px-8 py-5 font-bold text-right">Total Revenue</th>
                                        <th className="px-8 py-5 font-bold text-right text-green-600">Received Amount</th>
                                        <th className="px-8 py-5 font-bold text-right text-red-600">Deductions</th>
                                        <th className="px-8 py-5 font-bold text-right text-orange-600">Pending Billing</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {stats.globalDivisionWiseData.map((d, index) => {
                                        return (
                                            <tr 
                                                key={index} 
                                                className="hover:bg-muted/20 transition-colors group cursor-pointer"
                                                onClick={() => navigate(`/finance/divisions/${encodeURIComponent(d.name)}`)}
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-4 ring-primary/5">
                                                            {index + 1}
                                                        </div>
                                                        <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors underline-offset-4 group-hover:underline">
                                                            {d.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right font-bold text-sm">
                                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(d.Revenue)}
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-sm text-green-600">
                                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(d.Billed)}
                                                </td>
                                                <td className="px-8 py-5 text-right font-bold text-sm text-red-600">
                                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(d.Deductions)}
                                                </td>
                                                <td className="px-8 py-5 text-right font-bold text-sm text-orange-600">
                                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(d.Outstanding)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </PageTransition>
        </AppLayout>
    );
}
