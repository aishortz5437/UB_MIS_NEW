import { useEffect, useState, useMemo } from 'react';
import { IndianRupee, PieChart as PieChartIcon, ListFilter, FileText, ArrowRight, Landmark } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const LIFECYCLE_COLORS = ['#22c55e', '#f97316', '#3b82f6'];

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

      if (worksRes.data) setWorks((worksRes.data as unknown) as Work[]);
      if (divisionsRes.data) setDivisions(divisionsRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalCount = works.length;

    const totalCost = works.reduce((sum, work) => sum + (Number(work.consultancy_cost) || 0), 0);

    const completedVal = works
      .filter(w => w.status === 'Completed')
      .reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);

    const runningVal = works
      .filter(w => w.status === 'Running' || w.status === 'Running R1' || w.status === 'Running R2' || w.status === 'Running R3')
      .reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);

    const pipelineVal = works
      .filter(w => w.status === 'Pipeline')
      .reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);

    const format = (val: number) => new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(val);

    const statusCounts = {
      pipeline: works.filter(w => w.status === 'Pipeline').length,
      running: works.filter(w => w.status === 'Running' || w.status === 'Running R1' || w.status === 'Running R2' || w.status === 'Running R3').length,
      completed: works.filter(w => w.status === 'Completed').length,
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
    { name: 'Completed', value: stats.statusCounts.completed, color: '#22c55e' },
    { name: 'Running', value: stats.statusCounts.running, color: '#f97316' },
    { name: 'Pipeline', value: stats.statusCounts.pipeline, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const divisionColors: Record<string, string> = {
    RnB: 'bg-ub-rnb', Arch: 'bg-ub-btp', EnS: 'bg-ub-ens',
  };

  if (loading) return (
    <AppLayout>
      <div className="page-shell space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          <Skeleton className="h-[320px] w-full rounded-2xl" />
          <Skeleton className="h-[320px] w-full rounded-2xl" />
        </div>
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
      <PageTransition>
        <div className="relative isolate min-h-screen">
          {/* Premium Decorative Background Gradients */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-[20%] -left-[10%] h-[700px] w-[700px] rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-[120px] dark:from-primary/20" />
            <div className="absolute top-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-indigo-500/10 to-transparent blur-[120px] dark:from-indigo-500/20" />
            <div className="absolute -bottom-[10%] left-[20%] h-[800px] w-[800px] rounded-full bg-gradient-to-tr from-purple-500/10 to-transparent blur-[120px] dark:from-purple-500/20" />
          </div>

          <div className="page-shell space-y-8 pb-12">
            {/* Header */}
            <motion.div
              className="page-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="space-y-0.5">
                <h1 className="text-2xl xs:text-3xl md:text-5xl font-black tracking-tighter font-heading bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Dashboard</h1>
                <p className="text-base font-medium text-muted-foreground/80">Works Management Overview</p>
              </div>
            </motion.div>

            {/* Top Financial Stats Grid */}
            <motion.div
              className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Total Value Card */}
              <motion.div
                variants={itemVariants}
                className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Total Consultancy Value</p>
                    <p className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-primary font-heading drop-shadow-sm break-all">{formattedAnimatedCost}</p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-4 text-primary"><IndianRupee className="h-9 w-9" /></div>
                </div>

                <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 sm:gap-3 mt-8">
                  <Link to="/completed" className="rounded-xl bg-green-500/10 p-2 sm:p-2.5 border border-green-500/20 text-center flex flex-col justify-center min-w-0 hover:bg-green-500/20 transition-colors">
                    <p className="text-[10px] sm:text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-tight mb-0.5">Completed</p>
                    <p className="text-sm xs:text-base lg:text-base font-black tracking-tighter font-heading">{stats.completedCost.replace('₹', '')}</p>
                  </Link>
                  <Link to="/running" className="rounded-xl bg-orange-500/10 p-2 sm:p-2.5 border border-orange-500/20 text-center flex flex-col justify-center min-w-0 hover:bg-orange-500/20 transition-colors">
                    <p className="text-[10px] sm:text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tight mb-0.5">Running</p>
                    <p className="text-sm xs:text-base lg:text-base font-black tracking-tighter font-heading">{stats.runningCost.replace('₹', '')}</p>
                  </Link>
                  <div className="rounded-xl bg-blue-500/10 p-2 sm:p-2.5 border border-blue-500/20 text-center flex flex-col justify-center min-w-0">
                    <p className="text-[10px] sm:text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight mb-0.5">Pipeline</p>
                    <p className="text-sm xs:text-base lg:text-base font-black tracking-tighter font-heading">{stats.pipelineCost.replace('₹', '')}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-bold text-red-600 dark:text-red-400 border border-red-500/10 shadow-sm">
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
              </motion.div>

              {/* Lifecycle Distribution Card */}
              <motion.div
                variants={itemVariants}
                className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary"><PieChartIcon className="h-5 w-5" /></div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground/80">Lifecycle Distribution</p>
                      <p className="text-4xl font-black tracking-tighter text-foreground font-heading">{animatedTotal} <span className="text-sm font-bold text-muted-foreground/80 tracking-normal">works</span></p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400 whitespace-nowrap">
                    {Math.round((stats.statusCounts.completed / stats.totalCount) * 100 || 0)}% Done
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 flex-1">
                  {/* Donut Chart */}
                  <div className="h-[180px] w-[180px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={lifecycleData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={78}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {lifecycleData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={LIFECYCLE_COLORS[index % LIFECYCLE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend Stats */}
                  <div className="flex-1 grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 sm:gap-3 w-full">
                    <Link to="/completed" className="rounded-xl bg-green-500/10 p-2 sm:p-2.5 text-center border border-green-500/20 min-w-0 hover:bg-green-500/20 transition-colors">
                      <p className="text-xl sm:text-2xl font-black tracking-tighter text-green-600 dark:text-green-400 font-heading">{stats.statusCounts.completed}</p>
                      <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-tight text-muted-foreground mt-0.5">Completed</p>
                      <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/70">{stats.totalCount > 0 ? Math.round((stats.statusCounts.completed / stats.totalCount) * 100) : 0}%</p>
                    </Link>
                    <Link to="/running" className="rounded-xl bg-orange-500/10 p-2 sm:p-2.5 text-center border border-orange-500/20 min-w-0 hover:bg-orange-500/20 transition-colors">
                      <p className="text-xl sm:text-2xl font-black tracking-tighter text-orange-600 dark:text-orange-400 font-heading">{stats.statusCounts.running}</p>
                      <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-tight text-muted-foreground mt-0.5">Running</p>
                      <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/70">{stats.totalCount > 0 ? Math.round((stats.statusCounts.running / stats.totalCount) * 100) : 0}%</p>
                    </Link>
                    <div className="rounded-xl bg-blue-500/10 p-2 sm:p-2.5 text-center border border-blue-500/20 min-w-0">
                      <p className="text-xl sm:text-2xl font-black tracking-tighter text-blue-600 dark:text-blue-400 font-heading">{stats.statusCounts.pipeline}</p>
                      <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-tight text-muted-foreground mt-0.5">Pipeline</p>
                      <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/70">{stats.totalCount > 0 ? Math.round((stats.statusCounts.pipeline / stats.totalCount) * 100) : 0}%</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Divisions Summary */}
            <motion.div
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.h2 variants={itemVariants} className="text-2xl md:text-3xl font-black tracking-tight font-heading">UB Sectors Summary</motion.h2>
              <div className="grid gap-4 md:grid-cols-3 items-stretch">
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
                            colorClass={divisionColors[code] || 'bg-primary'}
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
              <motion.div variants={itemVariants} className="rounded-2xl border-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -mr-20 -mt-20 opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
                <div className="relative z-10">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary/80 mb-5 font-heading">Internal Tools</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link to="/works" className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] transition-all group backdrop-blur-sm text-white shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-white/10 text-white"><ListFilter className="h-5 w-5" /></div>
                        <span className="text-base font-bold font-heading">All Works</span>
                      </div>
                      <ArrowRight className="h-4 w-4 opacity-50 text-white group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                    </Link>
                    <Link to="/quotations" className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] transition-all group backdrop-blur-sm text-white shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-white/10 text-white"><FileText className="h-5 w-5" /></div>
                        <span className="text-base font-bold font-heading">Quotation Dashboard</span>
                      </div>
                      <ArrowRight className="h-4 w-4 opacity-50 text-white group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                    </Link>
                    <Link to="/finance" className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] transition-all group backdrop-blur-sm text-white shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-white/10 text-white"><Landmark className="h-5 w-5" /></div>
                        <span className="text-base font-bold font-heading">Financial Analysis</span>
                      </div>
                      <ArrowRight className="h-4 w-4 opacity-50 text-white group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
