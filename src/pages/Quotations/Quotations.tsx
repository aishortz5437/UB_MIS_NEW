import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Printer, Edit, Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Quotation } from '@/types/database';

export default function Quotations() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchQuotes() {
      const { data } = await (supabase as any)
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setQuotes(data as Quotation[]);
      setLoading(false);
    }
    fetchQuotes();
  }, []);

  const filteredQuotes = quotes.filter(q => 
    q.ubqn?.toLowerCase().includes(search.toLowerCase()) ||
    q.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    q.subject?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quotations Registry</h1>
            <p className="text-sm text-muted-foreground">Manage and track all generated consultancy offers</p>
          </div>
          <Link to="/quotations/new">
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold gap-2">
              <Plus className="h-4 w-4" /> New Quotation
            </Button>
          </Link>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search UBQN, Client or Subject..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-widest">UBQN</th>
                <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-widest">Client & Subject</th>
                <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-widest">Date</th>
                <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-widest text-right">Value</th>
                <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredQuotes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 font-mono text-xs font-bold text-blue-600">{q.ubqn}/{q.section}</td>
                  <td className="p-4">
                    <div className="text-sm font-bold text-slate-900 line-clamp-1">{q.client_name}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{q.subject}</div>
                  </td>
                  <td className="p-4 text-xs text-slate-600 font-medium">
                    {new Date(q.quotation_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="p-4 text-right font-mono text-sm font-black text-slate-700">
                    ₹{Number(q.consultancy_cost || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link to={`/quotations/${q.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/quotations/edit/${q.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
