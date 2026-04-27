import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Work } from '@/types/database';

interface DivisionCardProps {
  name: string;
  code: string;
  works: Work[];
  colorClass: string;
}

export function DivisionCard({ name, code, works, colorClass }: DivisionCardProps) {
  const totalWorks = works.length;

  // 1. Calculate the total cost for this division
  const totalCategoryCost = works.reduce(
    (sum, work) => sum + (Number(work.consultancy_cost) || 0),
    0
  );

  // 2. Filter status counts
  const running = works.filter((w) => w.status === 'Running R1' || w.status === 'Running R2').length;
  const pipeline = works.filter((w) => w.status === 'Pipeline').length;
  const completed = works.filter((w) => w.status.startsWith('Completed')).length;

  return (
    <div className="division-card animate-slide-up overflow-hidden border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
      {/* Top Color Strip */}
      <div className={cn('h-1.5', colorClass)} />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-foreground text-lg leading-tight font-heading">
              {name}
            </h3>
            <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">
              {code}
            </p>
          </div>

          {/* DYNAMIC CATEGORY COST */}
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground mb-1">
              Category Cost
            </p>
            <div className="flex items-center justify-end gap-1 text-m font-black text-primary tracking-tighter font-heading">
              <span className="text-s">₹</span>
              <span>{totalCategoryCost.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-12 grid grid-cols-3 gap-1 sm:gap-2 text-center">
          {/* 1. Completed */}
          <div className="rounded-xl px-1 py-3 border border-status-completed/10 bg-status-completed-bg/10 min-w-0 flex flex-col justify-center">
            <p className="text-xl font-black text-status-completed font-heading break-all">{completed}</p>
            <p className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tight text-muted-foreground">Completed</p>
          </div>

          {/* 2. Running (R1 + R2) with Live Indicator */}
          <div className="relative rounded-xl px-1 py-3 border border-orange-500/20 bg-orange-500/10 overflow-hidden min-w-0 flex flex-col justify-center">
            <div className="absolute top-1 right-1 flex h-1 w-1 sm:h-1.5 sm:w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1 sm:h-1.5 sm:w-1.5 bg-red-500"></span>
            </div>
            <p className="text-xl font-black text-orange-600 dark:text-orange-400 font-heading break-all">{running}</p>
            <p className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tight text-muted-foreground">Running</p>
          </div>

          {/* 3. Pipeline */}
          <div className="rounded-xl px-1 py-3 border border-blue-500/20 bg-blue-500/10 min-w-0 flex flex-col justify-center">
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 font-heading break-all">{pipeline}</p>
            <p className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tight text-muted-foreground">Pipeline</p>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs font-medium text-muted-foreground">
            {totalWorks} total works
          </span>
          <Link
            to={`/works?division=${code}`}
            className="group flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80"
          >
            Manage Works
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}