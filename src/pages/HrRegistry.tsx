import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, Search, Trash2, Edit3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { getReadableError } from '@/lib/errorHandler';

export default function HrRegistry() {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hrs, setHrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('delete');

  useEffect(() => {
    fetchHrs();
  }, []);

  async function fetchHrs() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('hand_receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHrs(data || []);
    } catch (error) {
      console.error("Error fetching hand receipts:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string, ubqn: string) => {
    if (!canDelete) return;
    if (!window.confirm(`Are you sure you want to delete HR ${ubqn}?`)) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('hand_receipts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHrs(hrs.filter(h => h.id !== id));
    } catch (error: unknown) {
      console.error('Error deleting hr:', error);
      alert(`Unable to delete HR. ${getReadableError(error)}`);
    }
  };

  const filteredHrs = hrs.filter(h =>
    h.ubqn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.work_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HR Dashboard</h1>
            <p className="text-slate-500 text-sm font-medium">Review and manage Hand Receipts</p>
          </div>
          <Button onClick={() => navigate('/hand-receipt/new')} className="bg-violet-600 hover:bg-violet-700 font-bold shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Generate New HR
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by UBQN, Department, or Work Name..."
            className="pl-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">UBQN </th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest min-w-[200px]">Department & Work Name</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Mode & Letter No</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Cost</th>
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
                      <td className="p-4">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><div className="flex justify-center gap-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-16" /></div></td>
                    </tr>
                  ))
                ) : filteredHrs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">No records found matching your search.</td>
                  </tr>
                ) : filteredHrs.map((hr) => (
                  <tr key={hr.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-all group">
                    <td className="p-4">
                      <span className="bg-violet-50 px-2 py-1 rounded text-[11px] font-black text-violet-700 font-mono border border-violet-100 whitespace-nowrap">
                        {hr.ubqn?.includes('-') ? hr.ubqn.split('-').pop()?.trim() : hr.ubqn}
                      </span>
                    </td>
                    <td className="p-4 whitespace-normal">
                      <p className="text-sm font-bold text-slate-900 line-clamp-2 md:line-clamp-1" title={hr.work_name || ''}>
                        {hr.work_name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight line-clamp-1 mt-0.5">
                        Dept: {hr.department}
                      </p>
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-600">
                      <p className="font-bold">{hr.mode || '-'}</p>
                      {hr.letter_no && <p className="text-[10px] text-slate-500 font-medium">{hr.letter_no}</p>}
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-black text-slate-900">
                        ₹{Number(hr.probable_cost || 0).toLocaleString('en-IN')}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        {hr.work_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-slate-200 text-slate-600 hover:bg-slate-100"
                            onClick={() => navigate(`/hand-receipts/edit/${hr.id}`)}
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                            <span className="text-[10px] font-bold uppercase">Edit</span>
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                            onClick={() => handleDelete(hr.id, hr.ubqn || 'unknown')}
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
