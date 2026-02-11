import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, Plus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AddContractorModal } from '@/components/thirdparty/AddContractorModal';
import { GlobalStatsCards } from '@/components/thirdparty/GlobalStatsCards';
import { 
  ThirdPartyContractor, 
  ThirdPartyWork, 
  ThirdPartyTransaction, 
  ContractorFormData 
} from '@/types/thirdParty';

interface ContractorWithStats extends ThirdPartyContractor {
  workCount: number;
  sanctionAmount: number;
  paidAmount: number;
  currentBalance: number; // Logic: Stage Targets - Amount Paid
  totalBalance: number;   // Logic: Sanctioned - Amount Paid
}

export default function ThirdPartyList() {
  const navigate = useNavigate();
  const [contractors, setContractors] = useState<ThirdPartyContractor[]>([]);
  const [allWorks, setAllWorks] = useState<ThirdPartyWork[]>([]);
  const [allTransactions, setAllTransactions] = useState<ThirdPartyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch Contractors, Works, and Transactions in parallel
      const [contractorsRes, worksRes, txRes] = await Promise.all([
        supabase.from('third_party_contractors').select('*').order('created_at', { ascending: false }),
        supabase.from('third_party_works').select('*'),
        supabase.from('third_party_transactions').select('*')
      ]);

      if (contractorsRes.error) throw contractorsRes.error;
      if (worksRes.error) throw worksRes.error;
      if (txRes.error) throw txRes.error;

      setContractors(contractorsRes.data || []);
      setAllWorks(worksRes.data || []);
      setAllTransactions(txRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- MATH ENGINE: Apply View 3 Logic Globally ---
  const { contractorsWithStats, globalStats } = useMemo(() => {
    let globalSanctioned = 0;
    let globalPaid = 0;
    let globalCurrentRequired = 0;

    const stats = contractors.map((contractor) => {
      const contractorWorks = allWorks.filter((w) => w.contractor_id === contractor.id);
      const contractorWorkIds = contractorWorks.map(w => w.id);
      const contractorTx = allTransactions.filter(t => contractorWorkIds.includes(t.work_id));

      const sanctionAmount = contractorWorks.reduce((sum, w) => sum + Number(w.sanction_amount || 0), 0);
      const paidAmount = contractorTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      let contractorCurrentRequired = 0;

      // Calculate stage requirements for each work order (25% gate logic)
      contractorWorks.forEach(work => {
        const sanctioned = Number(work.sanction_amount || 0);
        const workPaid = contractorTx.filter(t => t.work_id === work.id).reduce((sum, t) => sum + Number(t.amount || 0), 0);
        
        // Find highest stage reached/working on
        let activeStage = 1;
        if (workPaid >= sanctioned * 0.75) activeStage = 4;
        else if (workPaid >= sanctioned * 0.50) activeStage = 3;
        else if (workPaid >= sanctioned * 0.25) activeStage = 2;

        contractorCurrentRequired += (sanctioned * 0.25 * activeStage);
      });

      const currentBalance = contractorCurrentRequired - paidAmount;

      // Aggregate for Global Stats
      globalSanctioned += sanctionAmount;
      globalPaid += paidAmount;
      globalCurrentRequired += contractorCurrentRequired;

      return {
        ...contractor,
        workCount: contractorWorks.length,
        sanctionAmount,
        paidAmount,
        currentBalance,
        totalBalance: sanctionAmount - paidAmount,
      } as ContractorWithStats;
    });

    return {
      contractorsWithStats: stats,
      globalStats: {
        totalWorkAllotted: allWorks.length,
        totalSanctionedAmount: globalSanctioned,
        totalPaidAmount: globalPaid,
        totalBalance: globalSanctioned - globalPaid,
        totalCurrentBalance: globalCurrentRequired - globalPaid,
      }
    };
  }, [contractors, allWorks, allTransactions]);

  const handleAddContractor = async (data: ContractorFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('third_party_contractors').insert([{
        ub_id: data.ub_id,
        name: data.name,
        category: data.category,
        qualification: data.qualification || null,
        mobile: data.mobile || null,
      }]);
      if (error) throw error;
      toast.success('Contractor added');
      setIsAddModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContractor = async (contractorId: string) => { // Rename parameter to contractorId
  try {
    const { error } = await supabase
      .from('third_party_contractors')
      .delete()
      .eq('id', contractorId); // Column name as string 'id', value as contractorId

    if (error) throw error;
    toast.success('Removed successfully');
    fetchData();
  } catch (error) {
    toast.error('Failed to remove');
  }
};

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Third Party Management</h1>
            <p className="text-muted-foreground text-sm">Track contractors and stage-wise financial progress</p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Add T-P
          </Button>
        </div>

        {/* Global Stats Cards */}
        {!isLoading && contractors.length > 0 && (
          <GlobalStatsCards
            totalWorkAllotted={globalStats.totalWorkAllotted}
            totalSanctionedAmount={globalStats.totalSanctionedAmount}
            totalPaidAmount={globalStats.totalPaidAmount}
            totalBalance={globalStats.totalBalance}
            totalCurrentBalance={globalStats.totalCurrentBalance}
          />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : contractors.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">No contractors found</h3>
            <p className="text-slate-500 mb-6">Start by adding your first contractor or surveyor.</p>
            <Button onClick={() => setIsAddModalOpen(true)}>Add Contractor</Button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
  <Table>
    <TableHeader>
      <TableRow className="bg-slate-50/50">
        <TableHead className="w-[100px]">UBID</TableHead>
        <TableHead>Contractor Name</TableHead>
        <TableHead className="text-center w-[80px]">Works</TableHead>
        <TableHead className="text-right w-[120px]">Sanctioned</TableHead>
        <TableHead className="text-right w-[120px]">Total Paid</TableHead>
        
        {/* Total Balance - Assigned specific width for equal gap */}
        <TableHead className="text-right text-slate-500 w-[140px]">Total Balance</TableHead>
        
        {/* Current Balance - Assigned same width as Total Balance */}
        <TableHead className="text-right text-blue-700 w-[140px]">Current Balance</TableHead>
        
        <TableHead className="text-center w-[100px]">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {contractorsWithStats.map((contractor) => (
        <TableRow key={contractor.id} className="hover:bg-slate-50/50 transition-colors">
          <TableCell className="font-bold text-blue-600 font-mono text-sm">
            {contractor.ub_id}
          </TableCell>
          <TableCell>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 leading-none">{contractor.name}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                {contractor.category}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-center font-medium">
            {contractor.workCount}
          </TableCell>
          <TableCell className="text-right text-sm">
            {formatCurrency(contractor.sanctionAmount)}
          </TableCell>
          <TableCell className="text-right text-sm text-slate-600">
            {formatCurrency(contractor.paidAmount)}
          </TableCell>

          {/* Total Balance Cell */}
          <TableCell className="text-right text-sm font-medium text-slate-500">
            {formatCurrency(contractor.totalBalance)}
          </TableCell>

          {/* Current Balance Cell */}
          <TableCell
            className={`text-right font-bold text-sm ${
              contractor.currentBalance > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            <div className="flex flex-col items-end">
              <span>{formatCurrency(Math.abs(contractor.currentBalance))}</span>
              <span className="text-[9px] uppercase tracking-tighter opacity-80 font-bold">
                {contractor.currentBalance > 0 ? 'Immediate Due' : 'Advance Paid'}
              </span>
            </div>
          </TableCell>

          <TableCell>
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-blue-600"
                onClick={() => navigate(`/third-party/${contractor.id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Contractor?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{contractor.name}</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteContractor(contractor.id)} 
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
        )}
      </div>

      <AddContractorModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddContractor}
        isLoading={isSubmitting}
      />
    </AppLayout>
  );
}
