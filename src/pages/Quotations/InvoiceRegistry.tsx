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
import type { Invoice } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { getReadableError } from '@/lib/errorHandler';

export default function InvoiceRegistry() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('delete');

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  }

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

      setInvoices(invoices.filter(inv => inv.id !== id));
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

  const filteredInvoices = invoices.filter(inv =>
    (inv.ubqn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.bill_to_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        </div>
      </div>
    </AppLayout>
  );
}
