import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Printer, Edit3, Search, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client'; // Standardized import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout'; // Wrap in layout
import type { Quotation } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { getShorthand, formatDisplayUbqn, getWorkTotalCost } from '@/lib/utils';
import { getReadableError } from '@/lib/errorHandler';
import { useToast } from '@/hooks/use-toast';

type QuotationWithWork = Quotation & {
  work?: {
    id: string;
    status: string;
    consultancy_cost: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any;
  } | null;
  quotation_items?: {
    unit?: string | null;
    amount?: number | string | null;
  }[];
};

const getLocalQuoteMeta = (keys: (string | null | undefined)[]) => {
  try {
    const raw = localStorage.getItem('ub_quotation_meta_v1');
    if (!raw) return null;
    const store = JSON.parse(raw);
    for (const k of keys) {
      if (k && k.trim() && store[k.trim()]) return store[k.trim()];
    }
  } catch {
    // ignore
  }
  return null;
};

const extractEmbeddedPercentage = (items?: { unit?: string | null }[]): string | null => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const parts: string[] = [];
  for (const item of items) {
    const u = String(item.unit || '');
    const m = u.match(/^\[__M:PERCENTAGE:(.*?)__\]/);
    if (m && m[1] !== undefined) {
      try {
        const decoded = decodeURIComponent(m[1]).trim();
        if (decoded) parts.push(decoded);
      } catch {
        if (m[1].trim()) parts.push(m[1].trim());
      }
    }
  }
  return parts.length > 0 ? parts.join(' + ') : null;
};

export default function QuotationRegistry() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const PAGE_SIZE = 10;
  const [quotations, setQuotations] = useState<QuotationWithWork[]>([]);
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
      fetchQuotations(0, false, searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  async function fetchQuotations(pageIndex = 0, isAppend = false, search = '') {
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
        .from('quotations')
        .select('*, work:works(*), quotation_items(unit, amount)', { count: 'exact' })
        .order('created_at', { ascending: false });

      const cleanSearch = search.trim().replace(/[%_()]/g, '');
      if (cleanSearch) {
        query = query.or(
          `ubqn.ilike.%${cleanSearch}%,subject.ilike.%${cleanSearch}%,client_name.ilike.%${cleanSearch}%,division_name.ilike.%${cleanSearch}%`
        );
      }

      query = query.range(from, to);

      let { data, error, count } = await query;

      if (error) {
        // Fallback if a relation is unavailable in schema cache
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let fallbackQuery = (supabase as any)
          .from('quotations')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (cleanSearch) {
          fallbackQuery = fallbackQuery.or(
            `ubqn.ilike.%${cleanSearch}%,subject.ilike.%${cleanSearch}%,client_name.ilike.%${cleanSearch}%,division_name.ilike.%${cleanSearch}%`
          );
        }

        fallbackQuery = fallbackQuery.range(from, to);
        const fallback = await fallbackQuery;
        if (fallback.error) throw fallback.error;
        data = fallback.data;
        count = fallback.count;
      }

      const newRows = data || [];
      if (isAppend) {
        setQuotations(prev => [...prev, ...newRows]);
      } else {
        setQuotations(newRows);
      }

      if (typeof count === 'number') {
        setTotalCount(count);
        setHasMore(from + newRows.length < count);
      } else {
        setHasMore(newRows.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchQuotations(nextPage, true, searchTerm);
  };

  const handleDelete = async (id: string, ubqn: string) => {
    if (!canDelete) return;
    if (!window.confirm(`Are you sure you want to delete quotation ${ubqn}?`)) return;

    try {
      const targetQuote = quotations.find(q => q.id === id);
      const linkedWorkId = targetQuote?.work_id || targetQuote?.work?.id || null;
      const linkedWorkStatus = targetQuote?.work?.status || null;

      // 1. Delete related quotation items first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase as any)
        .from('quotation_items')
        .delete()
        .eq('quotation_id', id);
      if (itemsError) throw itemsError;

      // 2. Delete the quotation itself (releasing FK to works)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: quoteError } = await (supabase as any)
        .from('quotations')
        .delete()
        .eq('id', id);
      if (quoteError) throw quoteError;

      // 3. If the linked work is still in 'Pipeline' and has no other quotations, clean it up so no orphan pipeline work remains
      if (linkedWorkId && (!linkedWorkStatus || linkedWorkStatus === 'Pipeline')) {
        const { count: remainingQuotes } = await supabase
          .from('quotations')
          .select('id', { count: 'exact', head: true })
          .eq('work_id', linkedWorkId);

        if (!remainingQuotes || remainingQuotes === 0) {
          await supabase
            .from('works')
            .delete()
            .eq('id', linkedWorkId)
            .eq('status', 'Pipeline');
        }
      }

      setQuotations(prev => prev.filter(q => q.id !== id));
      setTotalCount(prev => (prev !== null ? Math.max(0, prev - 1) : null));
      toast({
        title: 'Quotation deleted',
        description: `Successfully deleted quotation ${ubqn}.`,
      });
    } catch (err: unknown) {
      console.error('Deletion error:', err);
      toast({
        title: 'Unable to delete quotation',
        description: getReadableError(err),
        variant: 'destructive',
      });
    }
  };


  const getClientDetailShorthand = (quote: Quotation) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawQuote = quote as any;
    const localMeta = getLocalQuoteMeta([quote.id, quote.work_id, quote.ubqn]);
    const abbreviatedValues = [
      rawQuote.client_name || localMeta?.client,
      rawQuote.division_name || rawQuote.division || localMeta?.division_display,
      rawQuote.department_name || rawQuote.department || localMeta?.department,
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => getShorthand(value))
      .filter(Boolean);

    const addressValue = (rawQuote.address || localMeta?.address)?.trim();
    const detailParts = [...abbreviatedValues, ...(addressValue ? [addressValue] : [])];

    if (detailParts.length > 0) return detailParts.join(' ');
    return getShorthand(rawQuote.subject || localMeta?.subject || '') || 'N/A';
  };

  // Filter logic for search bar
  const filteredQuotes = quotations.filter(q => {
    const normalizedSearch = searchTerm.toLowerCase();
    return (
      q.ubqn?.toLowerCase().includes(normalizedSearch) ||
      q.subject?.toLowerCase().includes(normalizedSearch) ||
      getClientDetailShorthand(q).toLowerCase().includes(normalizedSearch)
    );
  });

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
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest">UBQN </th>
                  <th className="p-4 text-[13px] font-black uppercase text-slate-900 tracking-widest min-w-[200px]">Client & Subject</th>
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
                ) : filteredQuotes.map((quote) => {
                  const workMeta = quote.work?.metadata && typeof quote.work.metadata === 'object' ? quote.work.metadata : null;
                  const localMeta = getLocalQuoteMeta([quote.id, quote.work_id, quote.ubqn]);
                  const embeddedPercentage = extractEmbeddedPercentage(quote.quotation_items);
                  const isPercentageQuote =
                    workMeta?.quote_mode === 'PERCENTAGE' ||
                    workMeta?.percentage_mode === true ||
                    localMeta?.quoteMode === 'PERCENTAGE' ||
                    Boolean(embeddedPercentage);
                  const percentageDisplay = isPercentageQuote
                    ? (workMeta?.display_total || localMeta?.displayTotal || embeddedPercentage)
                    : null;
                  const baseNumericCost = Number(quote.consultancy_cost) || Number(quote.work?.consultancy_cost) || 0;
                  const totalCostWithGst = quote.work
                    ? getWorkTotalCost({ consultancy_cost: baseNumericCost, metadata: workMeta })
                    : Math.round(baseNumericCost * 1.18);

                  const formattedDate = (() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const rawQuote = quote as any;
                    const rawDate = rawQuote.quotation_date || rawQuote.date || localMeta?.date || rawQuote.created_at;
                    if (!rawDate) return '-';
                    const d = new Date(rawDate);
                    return isNaN(d.getTime()) ? String(rawDate) : format(d, 'dd MMM yyyy');
                  })();

                  return (
                  <tr key={quote.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-all group">
                    <td className="p-4">
                      <span className="bg-blue-50 px-2 py-1 rounded text-[11px] font-black text-blue-700 font-mono border border-blue-100 whitespace-nowrap">
                        {formatDisplayUbqn(quote.ubqn, quote.section)}
                      </span>
                    </td>
                    <td className="p-4 whitespace-normal">
                      <p className="text-sm font-bold text-slate-900 line-clamp-2 md:line-clamp-1" title={quote.subject || ''}>
                        {quote.subject}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight line-clamp-1">
                          Client: {getClientDetailShorthand(quote)}
                        </p>
                        {quote.firm === 'URBANBUILD™ Pvt. Ltd.' && (
                          <span className="shrink-0 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[8px] font-black px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                            Pvt. Ltd.
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-600">
                      {formattedDate}
                    </td>
                    <td className="p-4 text-sm font-black text-slate-900">
                      {percentageDisplay ? (
                        <span className="text-blue-700 font-bold text-xs">{percentageDisplay}</span>
                      ) : (
                        `₹${totalCostWithGst.toLocaleString('en-IN')}`
                      )}
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
                          onClick={() => navigate(`/quotations/view/${quote.id}`)}
                        >
                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                          <span className="text-[10px] font-bold uppercase">Reprint</span>
                        </Button>
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                            onClick={() => handleDelete(quote.id, quote.ubqn || 'unknown')}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            <span className="text-[10px] font-bold uppercase">Delete</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load More Pagination Footer */}
          {hasMore && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-700">{filteredQuotes.length}</span> of{' '}
                <span className="font-bold text-slate-700">{totalCount !== null ? totalCount : 'many'}</span> quotations
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
                    Loading Quotations...
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                    Load More Quotations
                  </>
                )}
              </Button>
            </div>
          )}
          {!hasMore && quotations.length > 10 && (
            <div className="p-3 border-t border-slate-100 text-center bg-slate-50/30">
              <p className="text-xs text-slate-400">
                All {totalCount ?? quotations.length} quotations loaded
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
