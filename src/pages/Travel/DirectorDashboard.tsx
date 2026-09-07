import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LedgerTransaction } from '@/types/travel';
import { Users, TrendingUp, IndianRupee, HandCoins } from 'lucide-react';
import { toast } from 'sonner';

export default function DirectorDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settleDialog, setSettleDialog] = useState<{ isOpen: boolean, empId: string, name: string, balance: number }>({ isOpen: false, empId: '', name: '', balance: 0 });
  const [settlementDesc, setSettlementDesc] = useState('');

  async function fetchData() {
    setLoading(true);
    // Fetch all ledger transactions with employee details
    const { data, error } = await supabase
      .from('ledger_transactions')
      .select('*, profiles(full_name)');

    if (error) {
      toast.error('Failed to load ledger data');
    } else {
      setTransactions(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const totalAdvances = transactions
    .filter(t => t.transaction_type === 'Advance')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.transaction_type === 'Expense')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  // Group by employee
  const employeeBalances = transactions.reduce((acc, curr) => {
    const empId = curr.employee_id;
    if (!acc[empId]) {
      acc[empId] = {
        name: curr.profiles?.full_name || 'Unknown',
        advance: 0,
        expense: 0,
        balance: 0
      };
    }
    
    if (curr.transaction_type === 'Advance') {
      acc[empId].advance += Number(curr.amount);
      acc[empId].balance += Number(curr.amount);
    } else {
      acc[empId].expense += Math.abs(Number(curr.amount));
      acc[empId].balance -= Math.abs(Number(curr.amount));
    }
    
    return acc;
  }, {} as Record<string, { id: string, name: string, advance: number, expense: number, balance: number }>);

  const activeEmployees = Object.values(employeeBalances).length;
  const totalOutstanding = totalAdvances - totalExpenses;

  const handleManualSettlement = async () => {
    if (!settleDialog.empId) return;

    try {
      // If balance < 0 (Company owes employee), we record an 'Advance' to bring balance to 0. (Wait, Advance is + amount).
      // If balance > 0 (Employee owes company), we record an 'Expense' to bring balance to 0. (Wait, Expense is - amount).
      const isReimbursement = settleDialog.balance < 0;
      const transactionType = isReimbursement ? 'Advance' : 'Expense'; // Reimbursement means we give money (+). Refund means they return money, so we treat it as an expense (-) to clear their ledger balance.
      const amount = Math.abs(settleDialog.balance);

      const { error } = await supabase
        .from('ledger_transactions')
        .insert({
          employee_id: settleDialog.empId,
          transaction_type: transactionType,
          amount: isReimbursement ? amount : -amount,
          description: settlementDesc || (isReimbursement ? 'Manual Reimbursement Payment' : 'Manual Refund Collection')
        });

      if (error) throw error;
      toast.success('Manual settlement recorded successfully');
      setSettleDialog({ isOpen: false, empId: '', name: '', balance: 0 });
      setSettlementDesc('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record settlement');
    }
  };

  return (
    <AppLayout>
      <div className="w-full px-6 py-6 animate-in fade-in duration-500">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Travel & Ledger Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Global view of all employee travel advances and outstanding balances.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="shadow-sm border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Advances Issued</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalAdvances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses Settled</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-emerald-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <IndianRupee className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Employees with Ledger</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEmployees}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Employee Balances</CardTitle>
            <CardDescription>Breakdown of advances and expenses by employee.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground animate-pulse">Loading data...</div>
            ) : Object.keys(employeeBalances).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-accent/30">
                No ledger records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 font-semibold rounded-tl-lg">Employee Name</th>
                      <th className="px-6 py-4 font-semibold">Total Advances (₹)</th>
                      <th className="px-6 py-4 font-semibold">Total Expenses (₹)</th>
                      <th className="px-6 py-4 font-semibold text-right">Current Balance (₹)</th>
                      <th className="px-6 py-4 font-semibold text-right rounded-tr-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(employeeBalances).map(([empId, emp]: [string, any], idx) => (
                      <tr key={idx} className="hover:bg-accent/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{emp.name}</td>
                        <td className="px-6 py-4">{emp.advance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-orange-600">{emp.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className={`px-6 py-4 text-right font-bold ${emp.balance > 0 ? 'text-emerald-600' : emp.balance < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                          {emp.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={emp.balance === 0}
                            onClick={() => setSettleDialog({ isOpen: true, empId, name: emp.name, balance: emp.balance })}
                          >
                            <HandCoins className="h-4 w-4 mr-2" />
                            {emp.balance < 0 ? 'Reimburse' : emp.balance > 0 ? 'Collect' : 'Settled'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={settleDialog.isOpen} onOpenChange={(open) => !open && setSettleDialog(prev => ({...prev, isOpen: false}))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manual Ledger Settlement</DialogTitle>
              <DialogDescription>
                Zero out the balance for <strong>{settleDialog.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border">
                <span className="font-medium text-sm">Current Balance:</span>
                <span className={`font-bold text-lg ${settleDialog.balance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{Math.abs(settleDialog.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {settleDialog.balance < 0 
                  ? "This indicates the company owes the employee. By recording this, you confirm you have paid them this reimbursement amount."
                  : "This indicates the employee owes the company. By recording this, you confirm you have collected this refund amount from them."}
              </p>
              <div className="space-y-2">
                <Label>Description / Note (Optional)</Label>
                <Input 
                  value={settlementDesc} 
                  onChange={e => setSettlementDesc(e.target.value)} 
                  placeholder={settleDialog.balance < 0 ? "e.g., Paid via bank transfer" : "e.g., Cash collected by Accounts"}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettleDialog(prev => ({...prev, isOpen: false}))}>Cancel</Button>
              <Button onClick={handleManualSettlement} className="bg-primary">
                Confirm {settleDialog.balance < 0 ? 'Reimbursement' : 'Collection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
