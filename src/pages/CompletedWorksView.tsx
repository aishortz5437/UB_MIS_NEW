import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { WorksTable } from '@/components/works/WorksTable';
import type { Work, Division } from '@/types/database';
import { 
    LayoutGrid, 
    IndianRupee, 
    CheckCircle2, 
    FileText,
    Activity,
    Search,
    ChevronDown,
    Flag,
    ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type CompletedToggle = 'Completed' | 'Completed C1' | 'Completed C2';

export default function CompletedWorksView() {
    const [works, setWorks] = useState<Work[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<CompletedToggle>('Completed');
    const [sectorFilter, setSectorFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function fetchData() {
            const [worksRes, divisionsRes] = await Promise.all([
                supabase
                    .from('works')
                    .select('*, division:divisions(*)')
                    .eq('status', 'Completed')
                    .order('created_at', { ascending: false }),
                supabase.from('divisions').select('*'),
            ]);

            if (worksRes.data) setWorks((worksRes.data as unknown) as Work[]);
            if (divisionsRes.data) setDivisions(divisionsRes.data);
            setLoading(false);
        }
        fetchData();
    }, []);

    const sectorOptions = useMemo(() => {
        return [
            { id: 'all', label: 'All Sectors' },
            ...divisions.map(d => ({ 
                id: d.id, 
                label: d.name.replace('Division', '').replace('Sector', '').trim() 
            }))
        ];
    }, [divisions]);

    const filteredWorks = useMemo(() => {
        return works.filter(work => {
            // Status/Financial Matching
            let matchesTab = false;
            const finStatus = work.financial_data?.status;

            if (activeTab === 'Completed') {
                matchesTab = true; // All completed works
            } else if (activeTab === 'Completed C1') {
                matchesTab = finStatus === 'Final Bill';
            } else if (activeTab === 'Completed C2') {
                matchesTab = finStatus === 'Running Bill';
            }

            const matchesSector = sectorFilter === 'all' || work.division_id === sectorFilter;
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                work.work_name?.toLowerCase().includes(searchLower) ||
                work.ubqn?.toLowerCase().includes(searchLower) ||
                work.client_name?.toLowerCase().includes(searchLower);

            return matchesTab && matchesSector && matchesSearch;
        });
    }, [works, activeTab, sectorFilter, searchQuery]);

    const stats = useMemo(() => {
        const totalValue = filteredWorks.reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);
        return {
            count: filteredWorks.length,
            totalValue: new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(totalValue)
        };
    }, [filteredWorks]);

    return (
        <AppLayout>
            <PageTransition>
                <div className="page-shell space-y-4 pb-6">
                    <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-emerald-600 transition-colors mb-2 group"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                        Back to Dashboard
                    </Link>

                    {/* Compact Top Header & Stats Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm border-emerald-100">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-wider text-[10px]">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Closing Unit</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight font-heading text-slate-900">
                                Completed Works
                            </h1>
                        </div>

                        <div className="flex items-center gap-6 sm:gap-10">
                            <div className="flex flex-col text-right sm:text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Total Valuation</span>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                                        <IndianRupee className="h-4 w-4" />
                                    </div>
                                    <span className="text-2xl font-black font-heading text-emerald-600 leading-none">{stats.totalValue}</span>
                                </div>
                            </div>
                            <div className="h-10 w-px bg-emerald-100" />
                            <div className="flex flex-col text-right sm:text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Work Capacity</span>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                                        <LayoutGrid className="h-4 w-4" />
                                    </div>
                                    <span className="text-2xl font-black font-heading text-blue-600 leading-none">{stats.count}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Filters Toolbar */}
                    <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-4">
                        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
                            {/* Status Toggles */}
                            <div className="bg-muted py-1 px-1 rounded-xl flex gap-1 w-full xl:w-auto">
                                {(['Completed', 'Completed C1', 'Completed C2'] as CompletedToggle[]).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "flex-1 xl:flex-none px-5 py-2 rounded-lg text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 uppercase tracking-wide",
                                            activeTab === tab 
                                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                                                : "text-muted-foreground hover:bg-white/40 hover:text-foreground"
                                        )}
                                    >
                                        {tab === 'Completed' && <Flag className="h-3.5 w-3.5" />}
                                        {tab === 'Completed C1' && <Activity className="h-3.5 w-3.5" />}
                                        {tab === 'Completed C2' && <FileText className="h-3.5 w-3.5" />}
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 w-full xl:pl-4">
                                <Search className="absolute left-3 xl:left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search completed projects..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 xl:pl-14 h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-emerald-500/20 font-medium"
                                />
                            </div>

                            {/* Sector Filter */}
                            <div className="flex items-center gap-2 w-full xl:w-[240px]">
                                <div className="h-11 w-full relative">
                                    <select 
                                        value={sectorFilter}
                                        onChange={(e) => setSectorFilter(e.target.value)}
                                        className="w-full h-full pl-4 pr-10 rounded-xl bg-muted/30 border-none text-xs font-black uppercase tracking-widest appearance-none focus:outline-none"
                                    >
                                        {sectorOptions.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden min-h-[400px]">
                        <div className="p-4 border-b flex items-center justify-between bg-emerald-50/20">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3" />
                                Archive Registry
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter",
                                    activeTab === 'Completed C1' ? "bg-blue-100 text-blue-700" :
                                    activeTab === 'Completed C2' ? "bg-amber-100 text-amber-700" :
                                    "bg-emerald-100 text-emerald-700"
                                )}>
                                    {activeTab === 'Completed C1' ? "Final Settlement" : 
                                     activeTab === 'Completed C2' ? "Running Bill Analysis" : 
                                     "Full Archive"}
                                </span>
                            </div>
                        </div>
                        
                        <WorksTable 
                            works={filteredWorks} 
                            isLoading={loading} 
                        />
                        
                        {!loading && filteredWorks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 bg-muted/5">
                                <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p className="text-sm font-bold text-muted-foreground">No completed projects matching your selection</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Summary Strip */}
                    {!loading && filteredWorks.length > 0 && (
                        <div className="flex items-center justify-center gap-8 py-4 opacity-40 grayscale pointer-events-none">
                             <div className="text-[9px] font-black uppercase tracking-widest">UrbanBuild Group Archive</div>
                             <div className="h-1 w-1 rounded-full bg-slate-400" />
                             <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Certified Completion</div>
                             <div className="h-1 w-1 rounded-full bg-slate-400" />
                             <div className="text-[9px] font-black uppercase tracking-widest">MIS v2.4.0</div>
                        </div>
                    )}
                </div>
            </PageTransition>
        </AppLayout>
    );
}
