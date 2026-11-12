import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Printer, Edit3, Search, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import type { Invoice } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { getReadableError } from '@/lib/errorHandler';

export default function InvoiceRegistry() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const PAGE_SIZE = 10;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('delete');

  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(0);
      fetchInvoices(0, false, searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  async function fetchInvoices(pageIndex = 0, isAppend = false, search = '') {
    if (isAppend) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('invoices')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      const cleanSearch = search.trim().replace(/[%_()]/g, '');
      if (cleanSearch) {
        query = query.or(
          `ubqn.ilike.%${cleanSearch}%,invoice_number.ilike.%${cleanSearch}%,bill_to_name.ilike.%${cleanSearch}%`
        );
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      const newRows = data || [];
      if (isAppend) {
        setInvoices(prev => [...prev, ...newRows]);
      } else {
        setInvoices(newRows);
      }

      if (typeof count === 'number') {
        setTotalCount(count);
        setHasMore(from + newRows.length < count);
      } else {
        setHasMore(newRows.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchInvoices(nextPage, true, searchTerm);
  };

  const handleDelete = async (id: string, ubqn: string) => {
    if (!canDelete) return;
    if (!window.confirm(`Are you sure you want to delete invoice for ${ubqn}?`)) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInvoices(prev => prev.filter(inv => inv.id !== id));
      setTotalCount(prev => (prev !== null ? Math.max(0, prev - 1) : null));
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      toast({ title: "Unable to delete invoice", description: getReadableError(error), variant: "destructive" });
    }
  };

  const calculateTotal = (items: any[], gstType: string, gstRate: number) => {
    if (!items || !Array.isArray(items)) return 0;
    const taxable = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    let tax = 0;
    if (gstType === 'intra') {
      tax = (taxable * gstRate / 100) * 2;
    } else {
      tax = taxable * (gstRate * 2) / 100;
    }
    return Math.round(taxable + tax);
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (inv.ubqn || '').toLowerCase().includes(term) ||
      (inv.invoice_number || '').toLowerCase().includes(term) ||
      (inv.bill_to_name || '').toLowerCase().includes(term)
    );
  });

  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Dashboard</h1>
            <p className="text-slate-500 text-sm font-medium">Generate, Review, edit, and reprint Invoices</p>
          </div>
          <Button onClick={() => navigate('/invoice/new')} className="bg-amber-600 hover:bg-amber-700 font-bold shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Generate New Invoice
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by UBQN, Invoice No, or Bill To..."
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
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Invoice No</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">UBQN</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest min-w-[200px]">Bill To</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Date</th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">Amount</th>
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
                      </td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><div className="flex justify-center gap-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-16" /></div></td>
                    </tr>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 italic">No records found matching your search.</td>
                  </tr>
                ) : filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-all group">
                    <td className="p-4">
                      <span className="font-mono text-sm font-bold text-slate-800">
                        {invoice.invoice_number || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="bg-amber-50 px-2 py-1 rounded text-[11px] font-black text-amber-700 font-mono border border-amber-100 whitespace-nowrap">
                        {invoice.ubqn?.includes('-') ? invoice.ubqn.split('-').pop()?.trim() : invoice.ubqn}
                      </span>
                    </td>
                    <td className="p-4 whitespace-normal">
                      <p className="text-sm font-bold text-slate-900 line-clamp-2 md:line-clamp-1">
                        {invoice.bill_to_name}
                      </p>
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-600">
                      {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="p-4 text-sm font-black text-amber-700">
                      ₹{calculateTotal(invoice.items || [], invoice.gst_type || 'intra', invoice.gst_rate || 9).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-slate-200 text-slate-600 hover:bg-slate-100"
                          onClick={() => navigate(`/invoice/edit/${invoice.id}`)}
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                          <span className="text-[10px] font-bold uppercase">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white"
                          onClick={() => navigate(`/invoice/edit/${invoice.id}`)}
                        >
                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                          <span className="text-[10px] font-bold uppercase">Reprint</span>
                        </Button>
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                            onClick={() => handleDelete(invoice.id, invoice.ubqn || 'unknown')}
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

          {/* Load More Pagination Footer */}
          {hasMore && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-700">{filteredInvoices.length}</span> of{' '}
                <span className="font-bold text-slate-700">{totalCount !== null ? totalCount : 'many'}</span> invoices
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="bg-white hover:bg-slate-50 font-semibold text-xs border-slate-200 shadow-sm"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Loading Invoices...
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                    Load More Invoices
                  </>
                )}
              </Button>
            </div>
          )}
          {!hasMore && invoices.length > 10 && (
            <div className="p-3 border-t border-slate-100 text-center bg-slate-50/30">
              <p className="text-xs text-slate-400">
                All {totalCount ?? invoices.length} invoices loaded
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
