import { useEffect, useState, useMemo } from 'react';
import { Briefcase, IndianRupee, PieChart, Plus, ListFilter, FileText, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { DivisionCard } from '@/components/dashboard/DivisionCard';
import { RnBDivisionCard } from '@/components/dashboard/RnBDivisionCard';
import type { Work, Division } from '@/types/database';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
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

      // FIX: Ensure works state is set
      if (worksRes.data) setWorks((worksRes.data as unknown) as Work[]);
      if (divisionsRes.data) setDivisions(divisionsRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalCount = works.length;

    // GLOBAL FIX: Changed total_cost to consultancy_cost to match new schema
    const totalCost = works.reduce((sum, work) => sum + (Number(work.consultancy_cost) || 0), 0);

    // Status Financial Calculations (Matching your CSV Status casing)
    const completedVal = works
      .filter(w => w.status === 'Completed')
      .reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);

    const runningVal = works
      .filter(w => w.status === 'Running')
      .reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);

    const pipelineVal = works
      .filter(w => w.status === 'Pipeline')
      .reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);

    const format = (val: number) => new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(val);

    const statusCounts = {
      pipeline: works.filter(w => w.status === 'Pipeline').length,
      progress: works.filter(w => w.status === 'Running').length,
      completed: works.filter(w => w.status === 'Completed').length,
    };

    return {
      totalCount,
      formattedCost: format(totalCost),
      completedCost: format(completedVal),
      runningCost: format(runningVal),
      pipelineCost: format(pipelineVal),
      pendingTotal: format(runningVal + pipelineVal),
      statusCounts,
      rnbCount: works.filter((w) => w.division?.code === 'RnB').length,
      archCount: works.filter((w) => w.division?.code === 'BTP' || w.division?.code === 'Arch').length,
      ensCount: works.filter((w) => w.division?.code === 'EnS').length,
    };
  }, [works]);

  const divisionColors: Record<string, string> = {
    RnB: 'bg-ub-rnb', Arch: 'bg-ub-btp', EnS: 'bg-ub-ens',
  };

  if (loading) return (
    <AppLayout>
      <div className="page-shell space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {/* Total Value Skeleton */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm min-h-[300px]">
            <div className="flex justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-48" />
              </div>
              <Skeleton className="h-16 w-16 rounded-2xl" />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-8">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>

          {/* Operational Capacity Skeleton */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm min-h-[300px]">
            <div className="flex justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-16" />
              </div>
              <Skeleton className="h-16 w-16 rounded-2xl" />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-8">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* Divisions Summary Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {/* Changed max-w-[1200px] to max-w-7xl (1280px) or max-w-[1400px] for a wider look */}
      <div className="page-shell space-y-8">

        {/* Header */}
        <div className="page-header">
          <div className="space-y-0.5">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-m text-muted-foreground">Works Management Overview</p>
          </div>


        </div>

        {/* Top Financial Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {/* Total Value Card */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between h-full min-h-[300px]">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[15px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Consultancy Value</p>
                <p className="text-4xl font-black tracking-tighter text-primary">{stats.formattedCost}</p>
              </div>
              <div className="rounded-2xl bg-primary/10 p-4 text-primary"><IndianRupee className="h-9 w-9" /></div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8">
              <div className="rounded-xl bg-green-500/5 p-3 border border-green-500/20 text-center">
                <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Completed</p>
                <p className="text-base font-extrabold tracking-tight">{stats.completedCost.replace('₹', '')}</p>
              </div>
              <div className="rounded-xl bg-orange-500/5 p-3 border border-orange-500/20 text-center">
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Running</p>
                <p className="text-base font-extrabold tracking-tight">{stats.runningCost.replace('₹', '')}</p>
              </div>
              <div className="rounded-xl bg-blue-500/5 p-3 border border-blue-500/20 text-center">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Pipeline C1</p>
                <p className="text-base font-extrabold tracking-tight">{stats.pipelineCost.replace('₹', '')}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-red-500/5 px-3 py-1 text-[10px] font-bold text-red-600 border border-red-500/10 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="uppercase">Real-Time Revenue</span>
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  Pending: <span className="text-foreground">{stats.pendingTotal}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Capacity Card */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between h-full min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operational Capacity</p>
                <p className="text-5xl font-black tracking-tight text-green-600">{stats.totalCount}</p>
              </div>
              <div className="rounded-2xl bg-green-50 p-4 text-green-600 border border-green-100"><Briefcase className="h-9 w-9" /></div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8">
              <div className="rounded-xl bg-green-50 p-3 text-center">
                <p className="text-[9px] font-black text-green-600 uppercase mb-1">Completed</p>
                <p className="text-xl font-black">{stats.statusCounts.completed}</p>
              </div>
              <div className="rounded-xl bg-orange-50 p-3 text-center">
                <p className="text-[9px] font-black text-orange-600 uppercase mb-1">Running</p>
                <p className="text-xl font-black">{stats.statusCounts.progress}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Pipeline C1</p>
                <p className="text-xl font-black">{stats.statusCounts.pipeline}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delivery Progress</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">
                  {Math.round((stats.statusCounts.completed / stats.totalCount) * 100 || 0)}% Completed
                </span>
              </div>
              <div className="flex h-3 w-full gap-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all" style={{ width: `${(stats.statusCounts.completed / stats.totalCount) * 100}%` }} />
                <div className="h-full bg-orange-400 transition-all" style={{ width: `${(stats.statusCounts.progress / stats.totalCount) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Divisions Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight">Divisions Summary</h2>
          <div className="grid gap-4 md:grid-cols-3 items-stretch">
            {divisions
              // 1. Sort logic: Assign weights to force specific positions
              .sort((a, b) => {
                const getWeight = (code) => {
                  if (code === 'RnB') return 1;          // Left
                  if (code === 'Arch' || code === 'BTP') return 2; // Center
                  return 3;                              // Right
                };
                return getWeight(a.code) - getWeight(b.code);
              })
              // 2. Map through the sorted array
              .map((d) => {
                // Handle the naming fallback just in case
                const code = d.code === 'BTP' ? 'Arch' : d.code;
                const worksList = works.filter((w) => w.division_id === d.id);

                return code === 'RnB' ? (
                  <RnBDivisionCard
                    key={d.id}
                    name={d.name}
                    code="RnB"
                    works={worksList}
                  />
                ) : (
                  <DivisionCard
                    key={d.id}
                    name={d.name}
                    code={code}
                    works={worksList}
                    colorClass={divisionColors[code] || 'bg-primary'}
                  />
                );
              })}
          </div>
        </div>

        {/* Project Breakdown Footer */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-muted-foreground uppercase font-black text-[10px] tracking-widest italic">
              <PieChart className="h-4 w-4" /> Lifecycle Distribution
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border-l-4 border-green-500 pl-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Completed</p>
                <p className="text-2xl font-black">{stats.statusCounts.completed}</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Running</p>
                <p className="text-2xl font-black">{stats.statusCounts.progress}</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Pipeline</p>
                <p className="text-2xl font-black">{stats.statusCounts.pipeline}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-blue-600 p-6 flex flex-col justify-center space-y-4 text-white shadow-lg">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Internal Tools</h3>
            <Link to="/works" className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all group">
              <div className="flex items-center gap-3">
                <ListFilter className="h-4 w-4" />
                <span className="text-sm font-bold">All Works</span>
              </div>
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
            </Link>
            <Link to="/quotations" className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all group">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-bold">Quotation Dashboard</span>
              </div>
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
