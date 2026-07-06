import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Printer, Edit3, Search, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import type { ForwardingLetter } from '@/types/database';

export default function ForwardingLetterRegistry() {
  const navigate = useNavigate();
  const [letters, setLetters] = useState<ForwardingLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('delete');

  useEffect(() => {
    fetchLetters();
  }, []);

  async function fetchLetters() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('forwarding_letters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLetters(data || []);
    } catch (error) {
      console.error("Error fetching forwarding letters:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string, ubqn: string) => {
    if (!canDelete) return;
    if (!window.confirm(`Are you sure you want to delete forwarding letter for ${ubqn}?`)) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('forwarding_letters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLetters(letters.filter(l => l.id !== id));
    } catch (error: unknown) {
      console.error('Error deleting letter:', error);
      alert('Failed to delete forwarding letter');
    }
  };

  const filteredLetters = letters.filter(l =>
    (l.ubqn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.recipient_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.letter_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forwarding Letters Dashboard</h1>
            <p className="text-slate-500 text-sm font-medium">Generate, Review, edit, and reprint Forwarding Letters</p>
          </div>
          <Button onClick={() => navigate('/forwarding-letter/new')} className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Generate New Letter
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by UBQN, Letter No, or Subject..."
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
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Letter No</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">UBQN</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest min-w-[200px]">Subject & Recipient</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Date</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><div className="flex justify-center gap-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-16" /></div></td>
                    </tr>
                  ))
                ) : filteredLetters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">No records found matching your search.</td>
                  </tr>
                ) : filteredLetters.map((letter) => (
                  <tr key={letter.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-all group">
                    <td className="p-4">
                      <span className="font-mono text-sm font-bold text-slate-800">
                        {letter.letter_number || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="bg-emerald-50 px-2 py-1 rounded text-[11px] font-black text-emerald-700 font-mono border border-emerald-100 whitespace-nowrap">
                        {letter.ubqn?.includes('-') ? letter.ubqn.split('-').pop()?.trim() : letter.ubqn}
                      </span>
                    </td>
                    <td className="p-4 whitespace-normal">
                      <p className="text-sm font-bold text-slate-900 line-clamp-2 md:line-clamp-1" title={letter.subject || ''}>
                        {letter.subject}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight line-clamp-1">
                          To: {letter.recipient_title} {letter.recipient_division ? `, ${letter.recipient_division}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-600">
                      {letter.date ? format(new Date(letter.date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-slate-200 text-slate-600 hover:bg-slate-100"
                          onClick={() => navigate(`/forwarding-letter/edit/${letter.id}`)}
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                          <span className="text-[10px] font-bold uppercase">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                          onClick={() => navigate(`/forwarding-letter/edit/${letter.id}`)}
                        >
                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                          <span className="text-[10px] font-bold uppercase">Reprint</span>
                        </Button>
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                            onClick={() => handleDelete(letter.id, letter.ubqn || 'unknown')}
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
