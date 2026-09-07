import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Wallet, History, Plane, Calculator, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TravelRequisition, LedgerTransaction } from '@/types/travel';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';

export default function EmployeeDashboard() {
  const [requisitions, setRequisitions] = useState<TravelRequisition[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<LedgerTransaction | null>(null);
  const [txForm, setTxForm] = useState({
    transaction_type: 'Advance',
    amount: '',
    description: ''
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      const [reqRes, transRes] = await Promise.all([
        supabase
          .from('travel_requisitions')
          .select('*')
          .eq('employee_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('ledger_transactions')
          .select('*')
          .eq('employee_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (reqRes.data) setRequisitions(reqRes.data as TravelRequisition[]);
      if (transRes.data) setTransactions(transRes.data as LedgerTransaction[]);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const handleSaveTransaction = async () => {
    if (!txForm.amount || isNaN(Number(txForm.amount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      if (editingTx) {
        const { error } = await supabase
          .from('ledger_transactions')
          .update({
            transaction_type: txForm.transaction_type,
            amount: Number(txForm.amount),
            description: txForm.description
          })
          .eq('id', editingTx.id);
        if (error) throw error;
        toast.success('Transaction updated successfully');
      } else {
        const { error } = await supabase
          .from('ledger_transactions')
          .insert({
            employee_id: user?.id,
            transaction_type: txForm.transaction_type,
            amount: Number(txForm.amount),
            description: txForm.description
          });
        if (error) throw error;
        toast.success('Transaction added successfully');
      }
      setIsDialogOpen(false);
      setEditingTx(null);
      setTxForm({ transaction_type: 'Advance', amount: '', description: '' });
      // refresh transactions
      const { data } = await supabase
        .from('ledger_transactions')
        .select('*')
        .eq('employee_id', user?.id)
        .order('created_at', { ascending: false });
      if (data) setTransactions(data as LedgerTransaction[]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save transaction');
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const { error } = await supabase.from('ledger_transactions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Transaction deleted');
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error: any) {
      toast.error('Failed to delete transaction');
    }
  };

  const totalAdvance = transactions
    .filter(t => t.transaction_type === 'Advance')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const totalExpense = transactions
    .filter(t => t.transaction_type === 'Expense')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
  const currentBalance = totalAdvance - totalExpense;

  // Calculate running balances by reversing to oldest first, summing, and reversing back
  let currentRunningBalance = 0;
  const txWithBalance = [...transactions].reverse().map(tx => {
    const amount = Number(tx.amount);
    const effectiveAmount = tx.transaction_type === 'Advance' ? amount : -Math.abs(amount);
    currentRunningBalance += effectiveAmount;
    return { ...tx, runningBalance: currentRunningBalance };
  }).reverse();

  return (
    <AppLayout>
      <div className="w-full px-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Travel & Ledger Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your travel requisitions and view your ledger balance.</p>
          </div>
          <Button asChild className="shadow-lg hover:shadow-xl transition-all">
            <Link to="/travel/new">
              <Plus className="mr-2 h-4 w-4" /> New Requisition
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mb-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-0">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-xl font-bold text-emerald-600">₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-0">
              <CardTitle className="text-sm font-medium">Total Advances Received</CardTitle>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-lg font-bold">₹{totalAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-0">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-lg font-bold text-red-500">₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="requisitions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
            <TabsTrigger value="requisitions">Travel Requisitions</TabsTrigger>
            <TabsTrigger value="ledger">Ledger History</TabsTrigger>
          </TabsList>

          <TabsContent value="requisitions" className="mt-0">
            <Card className="shadow-sm border-t-4 border-t-primary/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  <CardTitle>Your Requisitions</CardTitle>
                </div>
                <CardDescription>Your travel requests and their approval status.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground animate-pulse">Loading...</div>
                ) : requisitions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">No requisitions found.</div>
                ) : (
                  <div className="space-y-4">
                    {requisitions.map(req => (
                      <div key={req.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div>
                          <div className="font-medium">{req.purpose}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(req.start_date), 'MMM d')} - {format(new Date(req.end_date), 'MMM d, yyyy')}
                            {req.duration && ` (${req.duration})`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-primary">Req: ₹{req.advance_required.toLocaleString()}</div>
                          <div className="text-xs space-x-2 mt-1">
                             <span className={`px-2 py-0.5 rounded-full ${req.ad_status === 'Approved' ? 'bg-green-100 text-green-700' : req.ad_status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>AD: {req.ad_status}</span>
                             <span className={`px-2 py-0.5 rounded-full ${req.director_status === 'Approved' ? 'bg-green-100 text-green-700' : req.director_status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>Dir: {req.director_status}</span>
                          </div>
                        </div>
                        <div className="ml-4 pl-4 border-l border-border/50 shrink-0">
                          {req.director_status === 'Approved' && (!req.settlement_status || req.settlement_status === 'Not Submitted' || req.settlement_status === 'Submitted') ? (
                             <Button size="sm" variant="outline" className="text-xs font-semibold" onClick={() => navigate(`/travel/expenses/${req.id}`)}>
                               <Calculator className="w-4 h-4 mr-1.5" />
                               Settlement
                             </Button>
                          ) : req.director_status === 'Approved' && req.settlement_status === 'Settled' ? (
                             <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-md flex items-center">
                               <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                               Settled
                             </span>
                          ) : (
                             <span className="text-xs text-muted-foreground italic flex h-8 items-center">
                               Waiting
                             </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ledger" className="mt-0">
            <Card className="shadow-sm border-t-4 border-t-emerald-500/50">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-500" />
                    <CardTitle>Personal Ledger</CardTitle>
                  </div>
                  <CardDescription className="mt-1">Manage manual ledger entries and track settlements.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) {
                    setEditingTx(null);
                    setTxForm({ transaction_type: 'Advance', amount: '', description: '' });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-4 h-4 mr-1" /> Add Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTx ? 'Edit Ledger Entry' : 'New Ledger Entry'}</DialogTitle>
                      <DialogDescription>Manually record funds received or expenses.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Transaction Type</Label>
                        <Select value={txForm.transaction_type} onValueChange={(val) => setTxForm({...txForm, transaction_type: val})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Advance">Received Funds (Advance)</SelectItem>
                            <SelectItem value="Expense">Spent Funds (Expense)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (₹)</Label>
                        <Input type="number" placeholder="0.00" value={txForm.amount} onChange={(e) => setTxForm({...txForm, amount: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="Enter details..." value={txForm.description} onChange={(e) => setTxForm({...txForm, description: e.target.value})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveTransaction}>Save Entry</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground animate-pulse">Loading...</div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">No transactions yet.</div>
                ) : (
                  <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="w-16 text-center font-bold text-xs uppercase tracking-wider text-foreground/70">S.No</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-foreground/70">Name of Exp / Details</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-foreground/70">Date</TableHead>
                          <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-foreground/70">Amount</TableHead>
                          <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-foreground/70">Outstanding</TableHead>
                          <TableHead className="w-24 text-right font-bold text-xs uppercase tracking-wider text-foreground/70 pr-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {txWithBalance.map((tx, idx) => (
                          <TableRow key={tx.id} className="group hover:bg-muted/30">
                            <TableCell className="text-center text-muted-foreground font-mono text-xs">
                              {txWithBalance.length - idx}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-foreground">{tx.description || '-'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="whitespace-nowrap">{format(new Date(tx.created_at), 'MMM d, yyyy')}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(tx.created_at), 'h:mm a')}</div>
                            </TableCell>
                            <TableCell className={`text-right font-semibold whitespace-nowrap ${tx.transaction_type === 'Advance' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {tx.transaction_type === 'Advance' ? '+' : '-'} ₹{Math.abs(Number(tx.amount)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary whitespace-nowrap">
                              ₹{(tx as any).runningBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              {!tx.requisition_id ? (
                                <div className="flex justify-end gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => {
                                    setEditingTx(tx);
                                    setTxForm({
                                      transaction_type: tx.transaction_type,
                                      amount: Math.abs(Number(tx.amount)).toString(),
                                      description: tx.description || ''
                                    });
                                    setIsDialogOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteTx(tx.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic bg-muted/50 px-2 py-1 rounded-md">Auto</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
