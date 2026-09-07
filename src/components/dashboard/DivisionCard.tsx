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

        {/* Status Grid */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          {/* Completed */}
          <Link to="/completed">
            <div className="rounded-lg px-2 py-3 border border-green-500/20 bg-green-500/10 min-w-0 flex flex-col justify-center hover:bg-green-500/20 transition-colors">
              <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase text-center mb-1">Completed</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-400 text-center font-heading truncate">
                {completed}
              </span>
            </div>
          </Link>

          {/* Running */}
          <Link to="/running">
            <div className="rounded-lg px-2 py-3 border border-orange-500/20 bg-orange-500/10 min-w-0 flex flex-col justify-center hover:bg-orange-500/20 transition-colors">
              <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase text-center mb-1">Running</span>
              <span className="text-lg font-bold text-orange-700 dark:text-orange-400 text-center font-heading truncate">
                {running}
              </span>
            </div>
          </Link>

          {/* Pipeline */}
          <Link to="/pipeline">
            <div className="rounded-lg px-2 py-3 border border-blue-500/20 bg-blue-500/10 min-w-0 flex flex-col justify-center hover:bg-blue-500/20 transition-colors">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase text-center mb-1">Pipeline</span>
              <span className="text-lg font-bold text-blue-700 dark:text-blue-400 text-center font-heading truncate">
                {pipeline}
              </span>
            </div>
          </Link>
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