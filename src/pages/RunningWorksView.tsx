import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { WorksTable } from '@/components/works/WorksTable';
import type { Work, Division } from '@/types/database';
import { 
    LayoutGrid, 
    IndianRupee, 
    Layers, 
    Briefcase,
    Activity,
    ClipboardList,
    Search,
    ChevronDown,
    ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';

type StatusToggle = 'Running' | 'Running R1' | 'Running R2';

export default function RunningWorksView() {
    const [works, setWorks] = useState<Work[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState<StatusToggle>('Running');
    const [sectorFilter, setSectorFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function fetchData() {
            const [worksRes, divisionsRes] = await Promise.all([
                supabase
                    .from('works')
                    .select('*, division:divisions(*)')
                    .in('status', ['Running', 'Running R1', 'Running R2'])
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
            let matchesStatus = false;
            if (activeStatus === 'Running') {
                matchesStatus = ['Running', 'Running R1', 'Running R2'].includes(work.status);
            } else {
                matchesStatus = work.status === activeStatus;
            }
            const matchesSector = sectorFilter === 'all' || work.division_id === sectorFilter;
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                work.work_name?.toLowerCase().includes(searchLower) ||
                work.ubqn?.toLowerCase().includes(searchLower) ||
                work.client_name?.toLowerCase().includes(searchLower);

            return matchesStatus && matchesSector && matchesSearch;
        });
    }, [works, activeStatus, sectorFilter, searchQuery]);

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
                        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-2 group"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                        Back to Dashboard
                    </Link>

                    {/* Compact Top Header & Stats Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-[10px]">
                                <Activity className="h-3.5 w-3.5" />
                                <span>Project Control Tower</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight font-heading text-slate-900">
                                Running Works
                            </h1>
                        </div>

                        <div className="flex items-center gap-6 sm:gap-10">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Cost of Individuals</span>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                                        <IndianRupee className="h-4 w-4" />
                                    </div>
                                    <span className="text-2xl font-black font-heading text-emerald-600 leading-none">{stats.totalValue}</span>
                                </div>
                            </div>
                            <div className="h-10 w-px bg-border/60" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Total Nos</span>
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
                                {(['Running', 'Running R1', 'Running R2'] as StatusToggle[]).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setActiveStatus(status)}
                                        className={cn(
                                            "flex-1 xl:flex-none px-5 py-2 rounded-lg text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 uppercase tracking-wide",
                                            activeStatus === status 
                                                ? "bg-white text-primary shadow-sm ring-1 ring-border/20" 
                                                : "text-muted-foreground hover:bg-white/40 hover:text-foreground"
                                        )}
                                    >
                                        {status === 'Running' && <Layers className="h-3.5 w-3.5" />}
                                        {status === 'Running R1' && <ClipboardList className="h-3.5 w-3.5" />}
                                        {status === 'Running R2' && <Briefcase className="h-3.5 w-3.5" />}
                                        {status}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 w-full border-l-0 xl:border-l xl:pl-4 border-border/60">
                                <Search className="absolute left-3 xl:left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Quick search work name or UBQN..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 xl:pl-14 h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 font-medium"
                                />
                            </div>

                            {/* Sector Filter Dropdown within toolbar (more compact than chips) */}
                            <div className="flex items-center gap-2 w-full xl:w-[240px]">
                                <div className="h-11 w-full relative">
                                    <select 
                                        value={sectorFilter}
                                        onChange={(e) => setSectorFilter(e.target.value)}
                                        className="w-full h-full pl-4 pr-10 rounded-xl bg-muted/30 border-none text-xs font-black uppercase tracking-widest appearance-none focus:outline-none ring-offset-background"
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
                        <div className="p-4 border-b flex items-center justify-between bg-muted/10">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Activity className="h-3 w-3 text-primary animate-pulse" />
                                Project Registry
                            </h3>
                            <div className="text-[10px] font-bold text-muted-foreground bg-white px-2 py-1 rounded-md border border-border/50">
                                Showing {filteredWorks.length} entries
                            </div>
                        </div>
                        
                        <WorksTable 
                            works={filteredWorks} 
                            isLoading={loading} 
                        />
                        
                        {!loading && filteredWorks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 bg-muted/5">
                                <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p className="text-sm font-bold text-muted-foreground">No records found matching current filters</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Summary Strip */}
                    {!loading && filteredWorks.length > 0 && (
                        <div className="flex items-center justify-center gap-8 py-4 opacity-40 grayscale pointer-events-none">
                             <div className="text-[9px] font-black uppercase tracking-widest">UrbanBuild Group Dashboard</div>
                             <div className="h-1 w-1 rounded-full bg-slate-400" />
                             <div className="text-[9px] font-black uppercase tracking-widest">Automated Financial Sync</div>
                             <div className="h-1 w-1 rounded-full bg-slate-400" />
                             <div className="text-[9px] font-black uppercase tracking-widest text-primary">MIS v2.4.0</div>
                        </div>
                    )}
                </div>
            </PageTransition>
        </AppLayout>
    );
}
