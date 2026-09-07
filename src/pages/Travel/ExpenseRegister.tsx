import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { TravelRequisition, TravelExpense } from '@/types/travel';
import { format } from 'date-fns';
import { Plus, Trash2, Send } from 'lucide-react';

export default function ExpenseRegister() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [requisition, setRequisition] = useState<TravelRequisition | null>(null);
  const [expenses, setExpenses] = useState<TravelExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [newExpense, setNewExpense] = useState({
    expense_date: '',
    category: '',
    amount: '',
    description: ''
  });

  const fetchData = async () => {
    if (!id || !user) return;
    try {
      // Fetch Requisition
      // @ts-ignore
      const { data: reqData, error: reqError } = await (supabase as any)
        .from('travel_requisitions')
        .select('*')
        .eq('id', id)
        .single();
        
      if (reqError) throw reqError;
      setRequisition(reqData);

      // Fetch Expenses
      // @ts-ignore
      const { data: expData, error: expError } = await (supabase as any)
        .from('travel_expenses')
        .select('*')
        .eq('requisition_id', id)
        .order('expense_date', { ascending: true });
        
      if (expError) throw expError;
      setExpenses(expData || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load expense data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    if (!newExpense.category || !newExpense.amount || !newExpense.expense_date) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      // @ts-ignore
      const { error } = await (supabase as any).from('travel_expenses').insert({
        requisition_id: id,
        employee_id: user.id,
        expense_date: newExpense.expense_date,
        category: newExpense.category,
        amount: Number(newExpense.amount),
        description: newExpense.description
      });

      if (error) throw error;
      
      toast.success('Expense added');
      setNewExpense({ expense_date: '', category: '', amount: '', description: '' });
      fetchData(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to add expense');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      // @ts-ignore
      const { error } = await (supabase as any).from('travel_expenses').delete().eq('id', expenseId);
      if (error) throw error;
      toast.success('Expense deleted');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to delete expense');
    }
  };

  const handleSubmitSettlement = async () => {
    if (!id) return;
    
    if (expenses.length === 0) {
      toast.error("Please add at least one expense before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      // @ts-ignore
      const { error } = await (supabase as any)
        .from('travel_requisitions')
        .update({ settlement_status: 'Pending Approval' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Settlement submitted for approval!');
      navigate('/travel');
    } catch (err: any) {
      toast.error('Failed to submit settlement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <AppLayout><div className="p-8 text-center animate-pulse">Loading...</div></AppLayout>;
  }

  if (!requisition) {
    return <AppLayout><div className="p-8 text-center text-red-500">Requisition not found.</div></AppLayout>;
  }

  const isEditable = requisition.settlement_status === 'Not Submitted' || !requisition.settlement_status;
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const netBalance = Number(requisition.advance_required) - totalExpenses; // Positive = Employee owes company, Negative = Company owes employee

  return (
    <AppLayout>
      <div className="w-full px-6 py-6 animate-in fade-in duration-300 max-w-6xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Expense Register</h1>
            <p className="text-muted-foreground mt-1">Trip: {requisition.travel_from} to {requisition.travel_to} ({requisition.purpose})</p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Summary Card */}
          <Card className="lg:col-span-1 border-t-4 border-t-primary shadow-sm h-fit">
            <CardHeader className="pb-4">
              <CardTitle>Settlement Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Advance Received:</span>
                <span className="font-semibold text-emerald-600">₹{Number(requisition.advance_required).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Total Actual Expenses:</span>
                <span className="font-semibold text-rose-600">₹{totalExpenses.toLocaleString()}</span>
              </div>
              
              <div className="pt-2 rounded-md">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-lg">Net Balance:</span>
                  <span className={`font-bold text-xl ${netBalance > 0 ? 'text-emerald-600' : netBalance < 0 ? 'text-rose-600' : 'text-gray-600'}`}>
                    ₹{Math.abs(netBalance).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-right text-muted-foreground italic">
                  {netBalance > 0 
                    ? "(You owe the company)" 
                    : netBalance < 0 
                      ? "(Company owes you)" 
                      : "(Fully settled)"}
                </p>
              </div>

              <div className="pt-4">
                <div className="text-sm font-medium mb-2">Status: <span className="text-primary bg-primary/10 px-2 py-1 rounded-full ml-1">{requisition.settlement_status || 'Not Submitted'}</span></div>
                
                {isEditable && (
                  <Button 
                    onClick={handleSubmitSettlement} 
                    disabled={submitting || expenses.length === 0} 
                    className="w-full mt-4"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Settlement
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expenses List & Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Add Expense Form */}
            {isEditable && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-lg">Add New Expense</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="space-y-2 lg:col-span-1">
                      <Label className="text-xs">Date</Label>
                      <Input type="date" required value={newExpense.expense_date} onChange={e => setNewExpense({...newExpense, expense_date: e.target.value})} className="h-9" />
                    </div>
                    <div className="space-y-2 lg:col-span-1">
                      <Label className="text-xs">Category</Label>
                      <Select value={newExpense.category} onValueChange={v => setNewExpense({...newExpense, category: v})} required>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Transport">Transport (Bus/Train/Flight)</SelectItem>
                          <SelectItem value="Local">Local Conveyance</SelectItem>
                          <SelectItem value="Food">Food & Meals</SelectItem>
                          <SelectItem value="Accommodation">Accommodation</SelectItem>
                          <SelectItem value="Driver">Driver Charge</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 lg:col-span-1">
                      <Label className="text-xs">Amount (₹)</Label>
                      <Input type="number" min="1" required value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="h-9" placeholder="0" />
                    </div>
                    <div className="space-y-2 lg:col-span-2 flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Description</Label>
                        <Input value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="h-9" placeholder="Brief details..." />
                      </div>
                      <Button type="submit" className="h-9 mt-auto shrink-0 bg-secondary text-secondary-foreground hover:bg-secondary/80">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Expenses Table */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">Logged Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground italic">
                    No expenses logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Category</th>
                          <th className="px-4 py-3 font-medium">Description</th>
                          <th className="px-4 py-3 font-medium text-right">Amount</th>
                          {isEditable && <th className="px-4 py-3 w-[50px]"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {expenses.map(exp => (
                          <tr key={exp.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 whitespace-nowrap">{format(new Date(exp.expense_date), 'MMM d, yyyy')}</td>
                            <td className="px-4 py-3">
                              <span className="bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded text-xs font-medium border border-secondary/30">
                                {exp.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 truncate max-w-[200px]">{exp.description || '-'}</td>
                            <td className="px-4 py-3 text-right font-semibold">₹{Number(exp.amount).toLocaleString()}</td>
                            {isEditable && (
                              <td className="px-4 py-3 text-center">
                                <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
