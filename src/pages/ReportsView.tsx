import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Work } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  Loader2,
  Download,
  ArrowLeft,
  IndianRupee,
  Briefcase,
  Layers,
  X,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { applyReportFilters } from '@/lib/reports/filters';
import { normalizeWork } from '@/lib/reports/normalizer';
import { renderExcel } from '@/lib/reports/excelRenderer';
import { DEFAULT_REPORT_COLUMNS, getVisibleColumns } from '@/lib/reports/columns';
import type { SubcategoryFilter } from '@/lib/reports/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export default function ReportsView() {
  const [subcategory, setSubcategory] = useState<SubcategoryFilter>('All');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const { data: rawWorks = [], isLoading } = useQuery({
    queryKey: ['works-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('works').select(`
        *,
        division:divisions(name, code)
      `).order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Work[];
    }
  });

  const toggleStatus = (statusName: string) => {
    if (selectedStatuses.includes(statusName)) {
      setSelectedStatuses(selectedStatuses.filter(s => s !== statusName));
    } else {
      setSelectedStatuses([...selectedStatuses, statusName]);
    }
  };

  const filteredWorks = useMemo(() => {
    return applyReportFilters(rawWorks, {
      subcategory,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined
    });
  }, [rawWorks, subcategory, selectedStatuses]);

  const stats = useMemo(() => {
    const totalCount = filteredWorks.length;
    const totalCost = filteredWorks.reduce((sum, w) => sum + (Number(w.consultancy_cost) || 0), 0);
    const pipelineCount = filteredWorks.filter(w => w.status === 'Pipeline').length;
    const runningR1Count = filteredWorks.filter(w => w.status === 'Running R1').length;
    const runningR2Count = filteredWorks.filter(w => w.status === 'Running R2').length;

    const format = (val: number) => new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(val);

    return {
      totalCount,
      formattedCost: format(totalCost),
      pipelineCount,
      runningR1Count,
      runningR2Count,
      runningTotal: runningR1Count + runningR2Count,
    };
  }, [filteredWorks]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await new Promise(resolve => setTimeout(resolve, 80));

      const normalizedWorks = filteredWorks.map(normalizeWork);
      const visibleCols = getVisibleColumns(DEFAULT_REPORT_COLUMNS);

      const statusLabel = selectedStatuses.length > 0 ? selectedStatuses.join('+') : 'ALL_STATUSES';
      const title = `REPORT - ${subcategory.toUpperCase()} - ${statusLabel.toUpperCase()}`;
      const filename = `Report_${subcategory}_${statusLabel}_${new Date().toISOString().split('T')[0]}`.replace(/ /g, '_');

      await renderExcel(normalizedWorks, visibleCols, { title, fileName: filename });

      toast({
        title: "Report Downloaded",
        description: `Exported ${filteredWorks.length} works into Excel.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export Failed",
        description: "An error occurred while generating the report.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <div className="relative isolate min-h-screen">
          <div className="page-shell space-y-8 p-6 pb-12 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              className="page-header flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="space-y-1">
                <Link to="/" className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-1">
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                  Back to Dashboard
                </Link>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
                  <FileSpreadsheet className="h-7 w-7 text-primary" />
                  Reports Generator
                </h1>
                <p className="text-sm text-muted-foreground">
                  Generate standard Excel reports filtered by category and project status.
                </p>
              </div>
            </motion.div>

            {/* Financial & Count Stats Grid */}
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Matching Works</p>
                    <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">{stats.totalCount}</p>
                  </div>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Pipeline</p>
                    <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-blue-600 dark:text-blue-400 mt-1">{stats.pipelineCount}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Running (R1+R2)</p>
                    <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-orange-600 dark:text-orange-400 mt-1">
                      {stats.runningTotal}
                      <span className="text-xs font-normal text-muted-foreground ml-2">({stats.runningR1Count} R1 / {stats.runningR2Count} R2)</span>
                    </p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-orange-500 mt-1.5" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Consultancy Value</p>
                    <p className="text-xl sm:text-2xl font-semibold tracking-tight text-green-600 dark:text-green-400 truncate mt-1">{stats.formattedCost}</p>
                  </div>
                  <IndianRupee className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </motion.div>
            </motion.div>

            {/* Filter Section */}
            <motion.div
              className="rounded-xl border bg-card p-6 shadow-sm space-y-6"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Category Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-foreground" />
                    Work Category
                  </span>
                  {subcategory !== 'All' && (
                    <button
                      onClick={() => setSubcategory('All')}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                    >
                      <X size={12} /> Reset
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSubcategory('All')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      subcategory === 'All'
                        ? 'bg-foreground text-background border-foreground shadow-sm'
                        : 'bg-background text-foreground border-border hover:bg-muted/50'
                    }`}
                  >
                    All Works
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubcategory('Road')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      subcategory === 'Road'
                        ? 'bg-foreground text-background border-foreground shadow-sm'
                        : 'bg-background text-foreground border-border hover:bg-muted/50'
                    }`}
                  >
                    Road
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubcategory('Bridge')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      subcategory === 'Bridge'
                        ? 'bg-foreground text-background border-foreground shadow-sm'
                        : 'bg-background text-foreground border-border hover:bg-muted/50'
                    }`}
                  >
                    Bridge
                  </button>
                </div>
              </div>

              {/* Status Filter: Pick Specific */}
              <div className="border-t pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-foreground" />
                    Status Selection
                  </span>
                  {selectedStatuses.length > 0 && (
                    <button
                      onClick={() => setSelectedStatuses([])}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                    >
                      <X size={12} /> Clear Status
                    </button>
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  {['Pipeline', 'Running R1', 'Running R2'].map((st) => {
                    const isChecked = selectedStatuses.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleStatus(st)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                          isChecked
                            ? 'bg-foreground text-background border-foreground shadow-sm'
                            : 'bg-background text-foreground border-border hover:bg-muted/50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Footer */}
              <div className="border-t pt-5 flex items-center justify-end">
                <Button
                  size="default"
                  className="font-semibold text-xs h-10 px-6 shadow-sm transition-all flex items-center gap-2 w-full sm:w-auto"
                  disabled={isLoading || filteredWorks.length === 0 || isExporting}
                  onClick={handleExport}
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Generate Excel Report ({filteredWorks.length})
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
