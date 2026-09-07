import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { WorksTable } from '@/components/works/WorksTable';
import { Input } from '@/components/ui/input';
import type { Work, Division } from '@/types/database';
import { 
    LayoutGrid, 
    IndianRupee, 
    Layers, 
    Search,
    ArrowLeft,
    Activity,
    Briefcase,
    ChevronDown
} from 'lucide-react';

import { Link } from 'react-router-dom';

export default function PipelineView() {
    const [works, setWorks] = useState<Work[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [sectorFilter, setSectorFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

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

        const channel = supabase.channel('pipeline_works_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'works' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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
            const matchesStatus = work.status === 'Pipeline';
            const matchesSector = sectorFilter === 'all' || work.division_id === sectorFilter;
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                work.work_name?.toLowerCase().includes(searchLower) ||
                work.ubqn?.toLowerCase().includes(searchLower) ||
                work.client_name?.toLowerCase().includes(searchLower);

            return matchesStatus && matchesSector && matchesSearch;
        });
    }, [works, sectorFilter, searchQuery]);

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
                <div className="page-shell space-y-4 sm:space-y-6 pb-6 w-full max-w-full min-w-0">
                  {/* Header with centered title and left-aligned cards */}
                  <div className="flex items-center justify-between w-full gap-8 mb-4">
                    <div className="flex flex-col gap-1">
                      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Pipeline Management</h1>
                      <p className="text-sm text-muted-foreground">Manage ongoing proposals and upcoming project opportunities.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col p-4 sm:p-6 bg-muted/20 rounded-xl border border-border/50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Total Pipeline Value</span>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                            <IndianRupee className="h-4 sm:h-5 w-4 sm:w-5" />
                          </div>
                          <span className="text-xl sm:text-2xl font-black font-heading text-emerald-600 truncate">{stats.totalValue}</span>
                        </div>
                      </div>
                      <div className="flex flex-col p-4 sm:p-6 bg-muted/20 rounded-xl border border-border/50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Total Pipeline Works</span>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                            <LayoutGrid className="h-4 sm:h-5 w-4 sm:w-5" />
                          </div>
                          <span className="text-xl sm:text-2xl font-black font-heading text-blue-600 truncate">{stats.count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <hr className="my-4 border-t border-muted/30" />
                    

                    {/* Integrated Filters Toolbar */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border shadow-sm space-y-4 w-full min-w-0 overflow-hidden">
                        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between w-full">
                            
                            {/* Search */}
                            <div className="relative flex-1 w-full border-border/60">
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
                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden min-h-[400px] w-full min-w-0">
                        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between bg-muted/10 gap-3">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Activity className="h-3 w-3 text-primary animate-pulse" />
                                Project Registry
                            </h3>
                            <div className="text-[10px] font-bold text-muted-foreground bg-white px-2 py-1 rounded-md border border-border/50 text-center">
                                Showing {filteredWorks.length} entries
                            </div>
                        </div>
                        
                        <div className="w-full overflow-x-auto min-w-0">
                            <WorksTable 
                                works={filteredWorks} 
                                isLoading={loading} 
                            />
                        </div>
                        
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
