import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Printer, Loader2, Edit3, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client'; // Standardized import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout'; // Wrap in layout
import type { Quotation } from '@/types/database';

export default function QuotationRegistry() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchQuotations();
  }, []);

  async function fetchQuotations() {
    try {
      // GLOBAL FIX: Cast to any to bypass the "quotations table not found" error
      const { data, error } = await (supabase as any)
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter logic for search bar
  const filteredQuotes = quotations.filter(q =>
    q.ubqn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        {/* Header Section */}
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotation Dashboard</h1>
            <p className="text-slate-500 text-sm font-medium">Generate, Review, edit, and reprint issued Quotations</p>
          </div>
          <Button onClick={() => navigate('/quotations/new')} className="bg-blue-600 hover:bg-blue-700 font-bold shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Generate New Quotation
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by UBQN, Client, or Subject..."
            className="pl-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">UBQN </th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Client & Subject</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Issue Date</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Consultancy Cost</th>
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
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><div className="flex justify-center gap-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-16" /></div></td>
                    </tr>
                  ))
                ) : filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">No records found matching your search.</td>
                  </tr>
                ) : filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-all group">
                    <td className="p-4">
                      <span className="bg-blue-50 px-2 py-1 rounded text-[11px] font-black text-blue-700 font-mono border border-blue-100">
                        {quote.ubqn}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-900 line-clamp-1" title={quote.subject || ''}>
                        {quote.subject}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">
                        Client: {quote.client_name}
                      </p>
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-600">
                      {quote.quotation_date ? format(new Date(quote.quotation_date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="p-4 text-sm font-black text-slate-900">
                      ₹{Number(quote.consultancy_cost).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-slate-200 text-slate-600 hover:bg-slate-100"
                          onClick={() => navigate(`/quotations/edit/${quote.id}`)}
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                          <span className="text-[10px] font-bold uppercase">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white"
                          onClick={() => navigate(`/quotations/${quote.id}`)}
                        >
                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                          <span className="text-[10px] font-bold uppercase">Reprint</span>
                        </Button>
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
