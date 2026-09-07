import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TravelRequisition } from '@/types/travel';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Check, X, Clock, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Approvals() {
  const [requisitions, setRequisitions] = useState<TravelRequisition[]>([]);
  const [settlements, setSettlements] = useState<TravelRequisition[]>([]);
  const [settlementExpenses, setSettlementExpenses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { role, hasPermission } = useAuth();
  
  const isDirector = role === 'Director';
  const isAD = role === 'Assistant Director';
  
  const fetchRequisitions = async () => {
    setLoading(true);
    let query = supabase
      .from('travel_requisitions')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    // Filter based on role
    if (isDirector) {
      query = query.eq('ad_status', 'Approved').eq('director_status', 'Pending');
    } else if (isAD) {
      query = query.eq('ad_status', 'Pending');
    }
    // Admins might see all pending, but usually approvals are by AD/Director
    
    const { data, error } = await query;
    if (error) {
      toast.error('Failed to load requisitions');
    } else {
      setRequisitions(data as any);
    }

    // Fetch Settlements
    let settlementQuery = supabase
      .from('travel_requisitions')
      .select('*, profiles(full_name)')
      .order('updated_at', { ascending: false });

    if (isDirector) {
      settlementQuery = settlementQuery.eq('settlement_status', 'AD Approved');
    } else if (isAD) {
      settlementQuery = settlementQuery.eq('settlement_status', 'Submitted');
    }
    
    const { data: sData, error: sError } = await settlementQuery;
    if (!sError && sData) {
      setSettlements(sData as any);
      
      // Fetch expenses for these settlements to calculate totals
      const reqIds = sData.map(s => s.id);
      if (reqIds.length > 0) {
        const { data: expData } = await supabase
          .from('travel_expenses')
          .select('requisition_id, amount')
          .in('requisition_id', reqIds);
          
        if (expData) {
          const expenseTotals: Record<string, number> = {};
          expData.forEach(exp => {
            expenseTotals[exp.requisition_id] = (expenseTotals[exp.requisition_id] || 0) + Number(exp.amount);
          });
          setSettlementExpenses(expenseTotals);
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRequisitions();
  }, [role]);

  const handleAction = async (id: string, action: 'Approve' | 'Reject', amount: number, employee_id: string) => {
    try {
      const updateData: any = {};
      if (isDirector) {
        updateData.director_status = action === 'Approve' ? 'Approved' : 'Rejected';
      } else if (isAD) {
        updateData.ad_status = action === 'Approve' ? 'Approved' : 'Rejected';
        // If AD rejects, director doesn't need to approve
        if (action === 'Reject') {
          updateData.director_status = 'Rejected';
        }
      }

      const { error } = await supabase
        .from('travel_requisitions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // If director approves, create ledger advance transaction
      if (isDirector && action === 'Approve') {
        const { error: ledgerError } = await supabase
          .from('ledger_transactions')
          .insert({
            employee_id: employee_id,
            transaction_type: 'Advance',
            amount: amount,
            requisition_id: id,
            description: `Advance for travel requisition`
          });
          
        if (ledgerError) throw ledgerError;
      }

      toast.success(`Requisition ${action.toLowerCase()}d successfully`);
      fetchRequisitions();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    }
  };

  const handleSettlementAction = async (req: TravelRequisition, action: 'Approve' | 'Reject') => {
    try {
      const updateData: any = {};
      if (isDirector) {
        updateData.settlement_status = action === 'Approve' ? 'Settled' : 'Rejected';
      } else if (isAD) {
        updateData.settlement_status = action === 'Approve' ? 'AD Approved' : 'Rejected';
      }

      const { error } = await supabase
        .from('travel_requisitions')
        .update(updateData)
        .eq('id', req.id);

      if (error) throw error;

      // If director approves settlement, create final ledger transaction for the net balance
      if (isDirector && action === 'Approve') {
        const totalExpense = settlementExpenses[req.id] || 0;
        const advance = Number(req.advance_required) || 0;
        const netBalance = advance - totalExpense; // Positive = Employee owes company, Negative = Company owes employee
        
        // Only create a transaction if there is a non-zero balance
        if (netBalance !== 0) {
          const { error: ledgerError } = await supabase
            .from('ledger_transactions')
            .insert({
              employee_id: req.employee_id,
              // If employee owes company (netBalance > 0), they refund it (Expense from company's view? No, they give money BACK to company. Advance was +, they return, so we put - to zero out?
              // Wait, if Advance was +1000, and they spent 800. NetBalance = 200. Employee owes 200.
              // To balance the ledger to 800, we add an 'Expense' of 800? 
              // Wait. The ledger represents the company's ledger for that employee.
              // Advance +1000 means employee holds 1000. 
              // If they spent 1200, company owes 200. We give them 200 more. (Advance +200)? No, we record Expense of 1200 (-1200). Then balance is -200 (company owes). Then we give them 200 (+200).
              // Let's just record the actual expenses in the ledger:
              transaction_type: 'Expense',
              amount: -totalExpense, // Negative for expenses
              requisition_id: req.id,
              description: `Settlement of actual expenses for travel`
            });
            
          if (ledgerError) throw ledgerError;
        } else {
          // If balance is exactly 0, still record the expense to clear the advance
          await supabase
            .from('ledger_transactions')
            .insert({
              employee_id: req.employee_id,
              transaction_type: 'Expense',
              amount: -totalExpense,
              requisition_id: req.id,
              description: `Settlement of actual expenses for travel`
            });
        }
      }

      toast.success(`Settlement ${action.toLowerCase()}d successfully`);
      fetchRequisitions();
    } catch (error: any) {
      toast.error(error.message || 'Settlement action failed');
    }
  };

  return (
    <AppLayout>
      <div className="w-full px-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Travel Approvals
          </h1>
          <p className="text-muted-foreground mt-1">
            {isDirector ? 'Review requisitions approved by Assistant Directors.' : 'Review pending travel requisitions from employees.'}
          </p>
        </div>

        {/* APPROVALS SECTION */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold tracking-tight">Pending Approvals</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Requisitions awaiting your decision.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">Loading...</div>
        ) : requisitions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-accent/30">
            No requisitions pending your approval.
          </div>
        ) : (
              <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
                      <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Employee</TableHead>
                      <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Purpose & Location</TableHead>
                      <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Dates</TableHead>
                      <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Advance Req.</TableHead>
                      <TableHead className="text-right font-bold text-foreground/70 uppercase tracking-wider text-xs pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisitions.map((req) => (
                      <TableRow key={req.id} className="group transition-colors hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium text-foreground">{req.profiles?.full_name || 'Unknown'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{req.purpose}</div>
                          <div className="text-muted-foreground text-xs mt-0.5">{req.travel_to}</div>
                        </TableCell>
                        <TableCell>
                          <div className="whitespace-nowrap">{format(new Date(req.start_date), 'MMM d')} - {format(new Date(req.end_date), 'MMM d, yy')}</div>
                          {req.duration && <div className="text-xs text-muted-foreground mt-0.5">{req.duration}</div>}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                            ₹{req.advance_required.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="outline" className="h-8 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700" onClick={() => handleAction(req.id, 'Approve', req.advance_required, req.employee_id)}>
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-8" asChild>
                              <Link to={`/travel/edit/${req.id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleAction(req.id, 'Reject', req.advance_required, req.employee_id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
        )}

        {/* SETTLEMENTS SECTION */}
        <div className="mt-12 mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight">Pending Settlements</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Review itemized travel expenses and approve final settlements.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">Loading...</div>
        ) : settlements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-accent/30">
            No settlements pending your approval.
          </div>
        ) : (
              <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
                      <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Employee</TableHead>
                      <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Purpose & Location</TableHead>
                      <TableHead className="font-bold text-foreground/70 uppercase tracking-wider text-xs">Status</TableHead>
                      <TableHead className="text-right font-bold text-foreground/70 uppercase tracking-wider text-xs">Balance Info</TableHead>
                      <TableHead className="text-right font-bold text-foreground/70 uppercase tracking-wider text-xs pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((req) => {
                      const totalExpense = settlementExpenses[req.id] || 0;
                      const advance = Number(req.advance_required) || 0;
                      const netBalance = advance - totalExpense;

                      return (
                        <TableRow key={req.id} className="group transition-colors hover:bg-muted/30">
                          <TableCell>
                            <div className="font-medium text-foreground">{req.profiles?.full_name || 'Unknown'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">{req.purpose}</div>
                            <div className="text-muted-foreground text-xs mt-0.5">{req.travel_to}</div>
                          </TableCell>
                          <TableCell>
                            <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-md font-medium border border-primary/20">
                              {req.settlement_status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-xs text-muted-foreground">Adv: ₹{advance.toLocaleString()} | Exp: <span className="text-rose-600">₹{totalExpense.toLocaleString()}</span></div>
                            <div className={`font-bold mt-1 ${netBalance > 0 ? 'text-emerald-600' : netBalance < 0 ? 'text-rose-600' : 'text-gray-600'}`}>
                              Net: ₹{Math.abs(netBalance).toLocaleString()} {netBalance > 0 ? '(Refund)' : netBalance < 0 ? '(Reimburse)' : ''}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="outline" className="h-8 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700" onClick={() => handleSettlementAction(req, 'Approve')}>
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-8" asChild>
                                <Link to={`/travel/expenses/${req.id}`}>
                                  Items
                                </Link>
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleSettlementAction(req, 'Reject')}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
      </div>
    </AppLayout>
  );
}
