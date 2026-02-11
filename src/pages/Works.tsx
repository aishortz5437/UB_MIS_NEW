import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { WorksTable } from '@/components/works/WorksTable';
import { WorkFilters } from '@/components/works/WorkFilters';
import type { Work, Division } from '@/types/database';

export default function Works() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [works, setWorks] = useState<Work[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state - Removed assignedTo as requested
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState(
    searchParams.get('division') || 'all'
  );
  const [statusFilter, setStatusFilter] = useState('all');

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

      setWorks((worksRes.data as unknown) as Work[]);
      if (divisionsRes.data) setDivisions(divisionsRes.data);
      setLoading(false);
    }

    fetchData();
  }, []);

  // Filter works logic updated for the new schema (ubqn and consultancy_cost)
  const filteredWorks = works.filter((work) => {
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

    if (divisionFilter !== 'all' && work.division?.code !== divisionFilter) {
      return false;
    }

    // Status is now case-sensitive 'Pipeline', 'Completed', etc.
    if (statusFilter !== 'all' && work.status !== statusFilter) {
      return false;
    }

    return true;
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
      <div className="page-shell space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">Works</h1>
            <p className="text-muted-foreground">
              Manage all running works and projects
            </p>
          </div>
          <Link to="/works/new">
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold">
              <Plus className="mr-2 h-4 w-4" />
              Add Work
            </Button>
          </Link>
        </div>

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
        />

        {/* Results count */}
        <div className="text-sm text-muted-foreground font-medium">
          Showing {filteredWorks.length} of {works.length} works
        </div>

        {/* Table - Fully updated for ubqn/consultancy_cost */}
        <WorksTable works={filteredWorks} isLoading={loading} />
      </div>
    </AppLayout>
  );
}
