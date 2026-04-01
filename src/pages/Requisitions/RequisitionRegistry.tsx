import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit2, FileText, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';

export default function RequisitionRegistry() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRequisitions();
    }, []);

    const fetchRequisitions = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('requisitions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Ignore error if table doesn't exist yet, just means user didn't run SQL yet
                console.log("No table yet or error:", error);
                setRequisitions([]);
            } else {
                setRequisitions(data || []);
            }
        } catch (error) {
            console.error('Error fetching requisitions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, ern: string) => {
        if (!window.confirm(`Are you sure you want to delete Requisition ${ern}?`)) return;

        try {
            const { error } = await (supabase as any).from('requisitions').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Deleted", description: "Requisition deleted successfully." });
            fetchRequisitions();
        } catch (error: any) {
            console.error("Error deleting:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const filteredReqs = requisitions.filter(r => 
        r.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.ern?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppLayout>
            <div className="flex flex-col h-[calc(100vh-100px)] bg-slate-50 p-6 font-sans">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-emerald-500" />
                            Requisitions Register
                        </h2>
                        <p className="text-xs text-slate-500">Track and manage advance and adjustment form requests.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search by Name, ERN, Purpose..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-64 pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                            />
                        </div>
                        <button
                            onClick={() => navigate('/requisitions/new')}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={14} /> New Request
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto border border-slate-100 rounded-lg relative">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Date</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Employee</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">ERN</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Purpose</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Amount Needed</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-slate-500 text-sm">
                                        Loading Requisitions... (If table doesn't exist, please run SQL script)
                                    </td>
                                </tr>
                            ) : filteredReqs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-slate-500 text-sm">
                                        No requisitions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredReqs.map((req) => (
                                    <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition whitespace-nowrap">
                                        <td className="p-4 text-xs font-medium text-slate-700">{new Date(req.date).toLocaleDateString()}</td>
                                        <td className="p-4 text-xs font-bold text-emerald-800">
                                            {req.employee_name}
                                            {req.is_adjustment && <span className="ml-2 text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Has Adjustments</span>}
                                        </td>
                                        <td className="p-4 text-xs font-mono text-slate-600 font-medium">{req.ern}</td>
                                        <td className="p-4 text-xs font-medium text-slate-600">
                                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                                                {req.purpose}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs font-black text-emerald-700">₹{Number(req.amount_needed).toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <span className="inline-block px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                {req.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => navigate(`/requisitions/edit/${req.id}`)}
                                                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition" 
                                                    title="View/Edit Requisition"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(req.id, req.ern)}
                                                    className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded transition" 
                                                    title="Delete Requisition"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </AppLayout>
    );
}
