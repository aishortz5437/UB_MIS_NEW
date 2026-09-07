import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, Search, Trash2, Edit3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { getReadableError } from '@/lib/errorHandler';

export default function TenderRegistry() {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tenders, setTenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('delete');

  useEffect(() => {
    fetchTenders();
  }, []);

  async function fetchTenders() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenders(data || []);
    } catch (error) {
      console.error("Error fetching tenders:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string, ubqn: string) => {
    if (!canDelete) return;
    if (!window.confirm(`Are you sure you want to delete tender ${ubqn}?`)) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('tenders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTenders(tenders.filter(t => t.id !== id));
    } catch (error: unknown) {
      console.error('Error deleting tender:', error);
      alert(`Unable to delete tender. ${getReadableError(error)}`);
    }
  };

  const filteredTenders = tenders.filter(t =>
    t.ubqn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.work_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tender Dashboard</h1>
            <p className="text-slate-500 text-sm font-medium">Review and manage issued Tenders</p>
          </div>
          <Button onClick={() => navigate('/tender/new')} className="bg-orange-600 hover:bg-orange-700 font-bold shadow-md w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Generate New Tender
          </Button>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by UBQN, Department, or Work Name..."
            className="pl-10 h-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden w-full min-w-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">UBQN </th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest min-w-[200px]">Department & Work Name</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Upload Date</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Costs</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </td>
                      <td className="p-4"><div className="flex justify-center gap-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-16" /></div></td>
                    </tr>
                  ))
                ) : filteredTenders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">No records found matching your search.</td>
                  </tr>
                ) : filteredTenders.map((tender) => (
                  <tr key={tender.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-all group">
                    <td className="p-4">
                      <span className="bg-orange-50 px-2 py-1 rounded text-[11px] font-black text-orange-700 font-mono border border-orange-100 whitespace-nowrap">
                        {tender.ubqn?.includes('-') ? tender.ubqn.split('-').pop()?.trim() : tender.ubqn}
                      </span>
                    </td>
                    <td className="p-4 whitespace-normal">
                      <p className="text-sm font-bold text-slate-900 line-clamp-2 md:line-clamp-1" title={tender.work_name || ''}>
                        {tender.work_name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight line-clamp-1 mt-0.5">
                        Dept: {tender.department}
                      </p>
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-600">
                      {tender.tender_upload_last_date ? format(new Date(tender.tender_upload_last_date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-black text-slate-900">
                        ₹{Number(tender.consultancy_cost || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">
                        EMD: ₹{Number(tender.emd_cost || 0).toLocaleString('en-IN')}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-center">
                        {tender.work_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-slate-200 text-slate-600 hover:bg-slate-100 w-full sm:w-auto"
                            onClick={() => navigate(`/tenders/edit/${tender.id}`)}
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                            <span className="text-[10px] font-bold uppercase">Edit</span>
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-red-100 text-red-600 hover:bg-red-600 hover:text-white w-full sm:w-auto"
                            onClick={() => handleDelete(tender.id, tender.ubqn || 'unknown')}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            <span className="text-[10px] font-bold uppercase">Delete</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
