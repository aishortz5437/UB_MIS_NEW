import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Work } from '@/types/database';

interface RnBDivisionCardProps {
  name: string;
  code: string;
  works: Work[];
}

export function RnBDivisionCard({ name, code, works }: RnBDivisionCardProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'Road' | 'Bridge'>('all');

  // Filter works based on selected tab
  const filteredWorks =
    activeTab === 'all'
      ? works
      : works.filter((w) => w.subcategory === activeTab);

  const totalWorks = filteredWorks.length;

  // Calculate Total Cost for the currently selected filter
  const totalCategoryCost = filteredWorks.reduce(
    (sum, work) => sum + (Number(work.consultancy_cost) || 0),
    0
  );

  const formattedCost = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(totalCategoryCost);

  // Stats for the Grid
  const running = filteredWorks.filter((w) => w.status === 'Running R1' || w.status === 'Running R2').length;
  const pipeline = filteredWorks.filter((w) => w.status === 'Pipeline').length;
  const completed = filteredWorks.filter((w) => w.status.startsWith('Completed')).length;

  const roadCount = works.filter((w) => w.subcategory === 'Road').length;
  const bridgeCount = works.filter((w) => w.subcategory === 'Bridge').length;

  return (
    <div className="division-card animate-slide-up overflow-hidden border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
      {/* Top Color Strip */}
      <div className="h-1.5 bg-ub-rnb" />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-lg leading-tight font-heading">{name}</h3>
            <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">
              {code}
            </p>
          </div>

          {/* REPLACED LOGO WITH TOTAL COST DISPLAY */}
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

        {/* Navigation Tabs */}
        <div className="mt-4 flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 rounded-md py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all',
              activeTab === 'all'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All ({works.length})
          </button>
          <button
            onClick={() => setActiveTab('Road')}
            className={cn(
              'flex-1 rounded-md py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all',
              activeTab === 'Road'
                ? 'bg-ub-roads text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Roads ({roadCount})
          </button>
          <button
            onClick={() => setActiveTab('Bridge')}
            className={cn(
              'flex-1 rounded-md py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all',
              activeTab === 'Bridge'
                ? 'bg-ub-bridges text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Bridges ({bridgeCount})
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          {/* Completed */}
          <Link to="/completed">
            <div className="rounded-lg px-2 py-3 border border-green-500/20 bg-green-500/10 min-w-0 flex flex-col justify-center hover:bg-green-500/20 transition-colors text-center">
              <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase text-center mb-1">Completed</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-400 text-center font-heading truncate">
                {completed}
              </span>
            </div>
          </Link>

          {/* Running */}
          <Link to="/running">
            <div className="rounded-lg px-2 py-3 border border-orange-500/20 bg-orange-500/10 min-w-0 flex flex-col justify-center hover:bg-orange-500/20 transition-colors text-center">
              <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase text-center mb-1">Running</span>
              <span className="text-lg font-bold text-orange-700 dark:text-orange-400 text-center font-heading truncate">
                {running}
              </span>
            </div>
          </Link>

          {/* Pipeline */}
          <Link to="/pipeline">
            <div className="rounded-lg px-2 py-3 border border-blue-500/20 bg-blue-500/10 min-w-0 flex flex-col justify-center hover:bg-blue-500/20 transition-colors text-center">
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
            {totalWorks} total items
          </span>
          <Link
            to={`/works?division=${code}${activeTab !== 'all' ? `&subcategory=${activeTab}` : ''}`}
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