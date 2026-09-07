import { useEffect, useState, useMemo } from 'react';
import { IndianRupee, PieChart as PieChartIcon, ListFilter, FileText, ArrowRight, Landmark, FileSpreadsheet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { DivisionCard } from '@/components/dashboard/DivisionCard';
import { RnBDivisionCard } from '@/components/dashboard/RnBDivisionCard';
import type { Work, Division } from '@/types/database';
import { useCountUp } from '@/hooks/useCountUp';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

/* ─── Animation Variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const LIFECYCLE_COLORS = ['#22c55e', '#f97316', '#3b82f6'];

import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { profile } = useAuth();
  const [works, setWorks] = useState<Work[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] || 'User';

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

    const channel = supabase.channel('dashboard_works_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'works' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const totalCount = works.length;

    const totalCost = works.reduce((sum, work) => sum + (Number(work.consultancy_cost) || 0), 0);

    const completedVal = works
      .filter(w => w.status.startsWith('Completed'))
      .reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);

    const runningVal = works
      .filter(w => w.status === 'Running R1' || w.status === 'Running R2')
      .reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);

    const pipelineVal = works
      .filter(w => w.status === 'Pipeline')
      .reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);

    const format = (val: number) => new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(val);

    const statusCounts = {
      pipeline: works.filter(w => w.status === 'Pipeline').length,
      running: works.filter(w => w.status === 'Running R1' || w.status === 'Running R2').length,
      completed: works.filter(w => w.status.startsWith('Completed')).length,
    };

    return {
      totalCount,
      totalCostRaw: totalCost,
      formattedCost: format(totalCost),
      completedCost: format(completedVal),
      runningCost: format(runningVal),
      pipelineCost: format(pipelineVal),
      pendingTotal: format(runningVal + pipelineVal),
      statusCounts,
    };
  }, [works]);

  /* Animated counters */
  const animatedTotal = useCountUp(stats.totalCount, 1200);
  const animatedCost = useCountUp(stats.totalCostRaw, 1400);

  const formattedAnimatedCost = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(animatedCost);

  const lifecycleData = [
    { name: 'Completed', value: stats.statusCounts.completed },
    { name: 'Running', value: stats.statusCounts.running },
    { name: 'Pipeline', value: stats.statusCounts.pipeline },
  ].filter(d => d.value > 0);

  const divisionColors: Record<string, string> = {
    RnB: 'bg-ub-rnb', Arch: 'bg-ub-btp', EnS: 'bg-ub-ens',
  };

  if (loading) return (
    <AppLayout>
      <div className="page-shell space-y-8 p-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[320px] w-full rounded-xl" />
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <PageTransition>
        <div className="relative isolate min-h-screen">
          <div className="page-shell space-y-10 p-6 pb-12">
            {/* Header */}
            <motion.div
              className="page-header flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Overview</h1>
                <p className="text-sm text-muted-foreground">Works Management Dashboard</p>
              </div>

              <div className="sm:text-right">
                <p 
                  className="text-2xl sm:text-3xl font-medium text-muted-foreground tracking-tight"
                  style={{ fontFamily: '"Dancing Script", "Caveat", cursive' }}
                >
                  {greeting}, <span className="text-foreground font-bold">{firstName}</span>
                </p>
              </div>
            </motion.div>

            {/* Top Financial Stats Grid */}
            <motion.div
              className="grid gap-6 md:grid-cols-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Total Value Card */}
              <motion.div
                variants={itemVariants}
                className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between h-full"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Total Consultancy Value</p>
                    <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground break-all">{formattedAnimatedCost}</p>
                  </div>
                  <IndianRupee className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
                  <Link to="/completed" className="flex flex-col min-w-0 hover:opacity-70 transition-opacity rounded-lg bg-green-500/10 p-3 border border-green-500/20">
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Completed</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300 truncate">{stats.completedCost.replace('₹', '')}</p>
                  </Link>
                  <Link to="/running" className="flex flex-col min-w-0 hover:opacity-70 transition-opacity rounded-lg bg-orange-500/10 p-3 border border-orange-500/20">
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">Running</p>
                    <p className="text-lg font-bold text-orange-700 dark:text-orange-300 truncate">{stats.runningCost.replace('₹', '')}</p>
                  </Link>
                  <Link to="/pipeline" className="flex flex-col min-w-0 col-span-2 sm:col-span-1 hover:opacity-70 transition-opacity rounded-lg bg-blue-500/10 p-3 border border-blue-500/20">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Pipeline</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300 truncate">{stats.pipelineCost.replace('₹', '')}</p>
                  </Link>
                </div>

                <div className="mt-8 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pending Revenue</span>
                    <span className="font-semibold text-foreground">{stats.pendingTotal}</span>
                  </div>
                </div>
              </motion.div>

              {/* Lifecycle Distribution Card */}
              <motion.div
                variants={itemVariants}
                className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between h-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Lifecycle Distribution</p>
                      <p className="text-xl font-semibold text-foreground">{animatedTotal} works</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {Math.round((stats.statusCounts.completed / stats.totalCount) * 100 || 0)}% Done
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 mt-4 flex-1">
                  {/* Donut Chart */}
                  <div className="h-[160px] w-full sm:w-[160px] flex-shrink-0 flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={lifecycleData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {lifecycleData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={LIFECYCLE_COLORS[index % LIFECYCLE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend Stats */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
                    <Link to="/completed" className="flex flex-col min-w-0 hover:opacity-70 transition-opacity rounded-lg bg-green-500/10 p-3 border border-green-500/20">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400 truncate">{stats.statusCounts.completed}</p>
                      <p className="text-xs font-semibold text-green-700 dark:text-green-300">Completed</p>
                    </Link>
                    <Link to="/running" className="flex flex-col min-w-0 hover:opacity-70 transition-opacity rounded-lg bg-orange-500/10 p-3 border border-orange-500/20">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 truncate">{stats.statusCounts.running}</p>
                      <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">Running</p>
                    </Link>
                    <Link to="/pipeline" className="flex flex-col min-w-0 col-span-2 sm:col-span-1 hover:opacity-70 transition-opacity rounded-lg bg-blue-500/10 p-3 border border-blue-500/20">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 truncate">{stats.statusCounts.pipeline}</p>
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Pipeline</p>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Divisions Summary */}
            <motion.div
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.h2 variants={itemVariants} className="text-lg font-semibold tracking-tight text-foreground">Sectors Summary</motion.h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
                {divisions
                  .sort((a, b) => {
                    const getWeight = (code: string) => {
                      if (code === 'RnB') return 1;
                      if (code === 'Arch' || code === 'BTP') return 2;
                      return 3;
                    };
                    return getWeight(a.code) - getWeight(b.code);
                  })
                  .map((d, i) => {
                    const code = d.code === 'BTP' ? 'Arch' : d.code;
                    const worksList = works.filter((w) => w.division_id === d.id);

                    return (
                      <motion.div key={d.id} variants={scaleVariants}>
                        {code === 'RnB' ? (
                          <RnBDivisionCard
                            name={d.name}
                            code="RnB"
                            works={worksList}
                          />
                        ) : (
                          <DivisionCard
                            name={d.name}
                            code={code}
                            works={worksList}
                            colorClass={divisionColors[code] || 'bg-muted'}
                          />
                        )}
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>

            {/* Internal Tools Footer */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="rounded-xl border bg-muted/20 p-6 shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground mb-6">Internal Tools</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link to="/works" className="flex items-center justify-between p-4 rounded-lg bg-card border hover:border-primary/30 transition-all group shadow-sm">
                    <div className="flex items-center gap-3">
                      <ListFilter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">All Works</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link to="/quotations" className="flex items-center justify-between p-4 rounded-lg bg-card border hover:border-primary/30 transition-all group shadow-sm">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Quotation Dashboard</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link to="/reports" className="flex items-center justify-between p-4 rounded-lg bg-card border hover:border-primary/30 transition-all group shadow-sm">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-foreground">Reports Dashboard</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link to="/finance" className="flex items-center justify-between p-4 rounded-lg bg-card border hover:border-primary/30 transition-all group shadow-sm">
                    <div className="flex items-center gap-3">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Financial Analysis</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
