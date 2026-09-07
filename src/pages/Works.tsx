import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorCodes } from '@/lib/errorCodes';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, FileText, FileCheck2, Receipt, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorksTable } from '@/components/works/WorksTable';
import { WorkFilters } from '@/components/works/WorkFilters';
import type { Work, Division } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { getReadableError } from '@/lib/errorHandler';
import { PageTransition } from '@/components/layout/PageTransition';
import { motion } from 'framer-motion';

export default function Works() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [works, setWorks] = useState<Work[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const { role, hasPermission } = useAuth();
  const canDelete = hasPermission('delete');
  const canApprove = hasPermission('approval');

  // Filter state - Preserved in sessionStorage
  const [search, setSearch] = useState(() => sessionStorage.getItem('works_search') || '');
  const [divisionFilter, setDivisionFilter] = useState(() => 
    searchParams.get('division') || sessionStorage.getItem('works_division') || 'all'
  );
  const [statusFilter, setStatusFilter] = useState(() => sessionStorage.getItem('works_status') || 'all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => 
    (sessionStorage.getItem('works_sort') as 'asc' | 'desc') || 'desc'
  );
  const [pvtLtdOnly, setPvtLtdOnly] = useState(() => sessionStorage.getItem('works_pvtLtd') === 'true');

  useEffect(() => {
    sessionStorage.setItem('works_search', search);
    sessionStorage.setItem('works_division', divisionFilter);
    sessionStorage.setItem('works_status', statusFilter);
    sessionStorage.setItem('works_sort', sortOrder);
    sessionStorage.setItem('works_pvtLtd', pvtLtdOnly.toString());
  }, [search, divisionFilter, statusFilter, sortOrder, pvtLtdOnly]);

  useEffect(() => {
    async function fetchData() {
      // Simplified fetch: Removed employees lookup
      const [worksRes, divisionsRes] = await Promise.all([
        supabase
          .from('works')
          .select('*, division:divisions(*)')
          .order('created_at', { ascending: false }),
        supabase.from('divisions').select('*'),
      ]);

      setWorks(((worksRes.data || []) as unknown) as Work[]);
      if (divisionsRes.data) setDivisions(divisionsRes.data);
      setLoading(false);
    }

    fetchData();
  }, []);

  // Filter works logic updated for the new schema (ubqn and consultancy_cost)
  const filteredWorks = works.filter((work) => {
    // Apply Pvt Ltd filter if enabled
    if (pvtLtdOnly && (work as any).firm !== 'URBANBUILD™ Pvt. Ltd.') {
      return false;
    }
    const searchLower = search.toLowerCase();

    // Search logic updated: Uses 'ubqn' instead of 'sn_no' or 'qtn_no'
    if (search) {
      const matchesWorkName = work.work_name?.toLowerCase().includes(searchLower);
      const matchesUBQN = work.ubqn?.toLowerCase().includes(searchLower);
      const matchesClient = work.client_name?.toLowerCase().includes(searchLower);

      if (!matchesWorkName && !matchesUBQN && !matchesClient) {
        return false;
      }
    }

    if (divisionFilter !== 'all') {
      if (divisionFilter === 'RnB-Road') {
        if (work.division?.code !== 'RnB' || work.subcategory !== 'Road') return false;
      } else if (divisionFilter === 'RnB-Bridge') {
        if (work.division?.code !== 'RnB' || work.subcategory !== 'Bridge') return false;
      } else if (work.division?.code !== divisionFilter) {
        return false;
      }
    }

    // Status is now case-sensitive 'Pipeline', 'Completed', etc.
    if (statusFilter !== 'all') {
      if (work.status !== statusFilter) return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort by latest added by default
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();

    const comparison = dateA - dateB;

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const hasFilters =
    search !== '' ||
    divisionFilter !== 'all' ||
    statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setDivisionFilter('all');
    setStatusFilter('all');
    setSearchParams({});
  };

  return (
    <AppLayout>
      <PageTransition>
        <div className="relative isolate min-h-screen">
          <div className="page-shell space-y-6 p-6 pb-12">
            {/* Header */}
            <motion.div
              className="page-header flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Works</h1>
                <p className="text-sm text-muted-foreground">
                  Manage all running works and projects
                </p>
              </div>
            </motion.div>

          {/* Filters - Simplified by removing assignedTo options */}
          <WorkFilters
            search={search}
            onSearchChange={setSearch}
            division={divisionFilter}
            onDivisionChange={setDivisionFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            divisions={divisions}
            onClearFilters={clearFilters}
            hasFilters={hasFilters}
            sortOrder={sortOrder}
            onSortChange={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            pvtLtdOnly={pvtLtdOnly}
            onPvtLtdChange={setPvtLtdOnly}
          />

          <div className="text-sm text-muted-foreground font-medium pb-2">
            Showing {filteredWorks.length} of {works.length} works
          </div>

          <div className="overflow-x-auto w-full pb-4 -mt-2">
            {/* Table - Fully updated for ubqn/consultancy_cost */}
            <WorksTable
              works={filteredWorks}
              isLoading={loading}
              onDelete={canDelete ? async (id, ubqn) => {
                try {
                  // Pre-delete dependency check
                  const tablesToCheck = [
                    { name: 'quotations', label: 'quotations' },
                    { name: 'forwarding_letters', label: 'forwarding letters' },
                    { name: 'invoices', label: 'invoices' },
                    { name: 'payments', label: 'payments' },
                    { name: 'remarks', label: 'remarks' },
                    { name: 'attachments', label: 'attachments' },
                    { name: 'tasks', label: 'tasks' }
                  ];

                  for (const table of tablesToCheck) {
                    const { count, error: checkErr } = await (supabase as any)
                      .from(table.name)
                      .select('id', { count: 'exact', head: true })
                      .eq('work_id', id);

                    if (!checkErr && count && count > 0) {
                      throw new Error(ErrorCodes.LINKED_RECORDS_EXIST);
                    }
                  }

                  const { error } = await supabase.from('works').delete().eq('id', id);
                  if (error) throw error;

                  setWorks(works.filter(w => w.id !== id));
                  toast.success(`Work order ${ubqn} deleted successfully`);
                } catch (error) {
                  console.error('Error deleting work:', error);
                  toast.error(getReadableError(error));
                }
              } : undefined}
              onApproveR2={canApprove ? async (id, ubqn) => {
                try {
                  const { error } = await supabase
                    .from('works')
                    .update({ status: 'Running R2', pending_r2_approval: false } as any)
                    .eq('id', id);
                  
                  if (error) throw error;
                  setWorks(works.map(w => w.id === id ? { ...w, status: 'Running R2', pending_r2_approval: false } as any : w));
                  toast.success(`R2 request for ${ubqn} approved`);
                } catch (error) {
                  console.error(error);
                  toast.error(`Unable to approve request. ${getReadableError(error)}`);
                }
              } : undefined}
              onRejectR2={canApprove ? async (id, ubqn) => {
                try {
                  const { error } = await supabase
                    .from('works')
                    .update({ pending_r2_approval: false } as any)
                    .eq('id', id);
                  
                  if (error) throw error;
                  setWorks(works.map(w => w.id === id ? { ...w, pending_r2_approval: false } as any : w));
                  toast.success(`R2 request for ${ubqn} rejected`);
                } catch (error) {
                  console.error(error);
                  toast.error(`Unable to reject request. ${getReadableError(error)}`);
                }
              } : undefined}
            />
          </div>
        </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
