import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Printer, Edit2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useReactToPrint } from 'react-to-print';

interface AdjustmentItem {
    sn: number;
    details: string;
    amount: number;
    billsAttached: boolean;
    ref: string;
}

export default function RequisitionForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const componentRef = useRef(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [header, setHeader] = useState({
        date: new Date().toISOString().split('T')[0],
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        employeeName: '',
        designation: '',
        ern: '',
        amountNeeded: 0,
        previouslyDrawn: 0,
        purpose: 'TA',
    });

    const [isAdjustment, setIsAdjustment] = useState(false);
    const [adjustmentItems, setAdjustmentItems] = useState<AdjustmentItem[]>([
        { sn: 1, details: '', amount: 0, billsAttached: false, ref: '' }
    ]);

    useEffect(() => {
        if (id) {
            loadRequisition();
        }
    }, [id]);

    const loadRequisition = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any).from('requisitions').select('*').eq('id', id).single();
            if (error) throw error;
            
            setHeader({
                date: data.date,
                month: data.month,
                employeeName: data.employee_name,
                designation: data.designation,
                ern: data.ern,
                amountNeeded: Number(data.amount_needed),
                previouslyDrawn: Number(data.previously_drawn),
                purpose: data.purpose,
            });

            setIsAdjustment(data.is_adjustment);
            
            if (data.adjustment_items && Array.isArray(data.adjustment_items) && data.adjustment_items.length > 0) {
                setAdjustmentItems(data.adjustment_items);
            }

        } catch (error: any) {
            console.error('Error loading requisition', error);
            toast({
                title: "Error",
                description: "Failed to load requisition data.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const addAdjustmentRow = () => {
        setAdjustmentItems([
            ...adjustmentItems,
            { sn: adjustmentItems.length + 1, details: '', amount: 0, billsAttached: false, ref: '' }
        ]);
    };

    const removeAdjustmentRow = (index: number) => {
        const newItems = adjustmentItems.filter((_, i) => i !== index).map((item, idx) => ({ ...item, sn: idx + 1 }));
        setAdjustmentItems(newItems.length ? newItems : [{ sn: 1, details: '', amount: 0, billsAttached: false, ref: '' }]);
    };

    const updateAdjustmentRow = (index: number, field: keyof AdjustmentItem, value: any) => {
        const newItems = [...adjustmentItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setAdjustmentItems(newItems);
    };

    const handleSave = async () => {
        if (!header.employeeName || !header.ern) {
            toast({ title: "Validation Error", description: "Employee Name and ERN are required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                date: header.date,
                month: header.month,
                employee_name: header.employeeName,
                designation: header.designation,
                ern: header.ern,
                amount_needed: header.amountNeeded,
                previously_drawn: header.previouslyDrawn,
                purpose: header.purpose,
                is_adjustment: isAdjustment,
                adjustment_items: isAdjustment ? adjustmentItems : []
            };

            if (id) {
                const { error } = await (supabase as any).from('requisitions').update(payload).eq('id', id);
                if (error) throw error;
                toast({ title: "Updated", description: "Requisition updated successfully!" });
            } else {
                const { error, data } = await (supabase as any).from('requisitions').insert(payload).select().single();
                if (error) throw error;
                toast({ title: "Saved", description: "Requisition created successfully!" });
                navigate(`/requisitions/edit/${data.id}`, { replace: true });
            }
        } catch (error: any) {
             console.error('Error saving requisition', error);
             toast({
                 title: "Error",
                 description: error.message || "Failed to save data. Please check if table exists via SQL.",
                 variant: "destructive"
             });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Requisition_${header.employeeName}_${header.date}`,
    });

    const totalAdjustment = useMemo(() => {
        return adjustmentItems.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
    }, [adjustmentItems]);


    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading Requisition Data...</div>;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] bg-slate-50 p-4 font-sans">
            {/* Input Form Panel */}
            <div className="w-full lg:w-[400px] bg-white p-5 rounded-lg shadow-sm border border-slate-200 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => navigate('/requisitions')} className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-emerald-600">
                        <ArrowLeft size={14} /> Back
                    </button>
                    <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <span className="bg-emerald-600 text-white p-1 rounded">
                            {id ? <Edit2 size={14} /> : <Plus size={14} />}
                        </span>
                        {id ? 'Edit Request' : 'New Request'}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="border-b pb-2">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">UB/Fin 01: Request Info</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Date</label>
                            <input type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Month</label>
                            <input type="text" value={header.month} onChange={e => setHeader({ ...header, month: e.target.value })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Employee Name</label>
                        <input type="text" value={header.employeeName} onChange={e => setHeader({ ...header, employeeName: e.target.value })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Designation</label>
                            <input type="text" value={header.designation} onChange={e => setHeader({ ...header, designation: e.target.value })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">ERN No.</label>
                            <input type="text" value={header.ern} onChange={e => setHeader({ ...header, ern: e.target.value })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase text-emerald-700">Amount Needed (₹)</label>
                            <input type="number" value={header.amountNeeded || ''} onChange={e => setHeader({ ...header, amountNeeded: parseFloat(e.target.value) || 0 })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-bold text-emerald-700" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase text-amber-700">Prev. unsettled (₹)</label>
                            <input type="number" value={header.previouslyDrawn || ''} onChange={e => setHeader({ ...header, previouslyDrawn: parseFloat(e.target.value) || 0 })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none bg-amber-50" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Purpose</label>
                        <select value={header.purpose} onChange={e => setHeader({ ...header, purpose: e.target.value })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-700">
                            <option value="TA">TA (Travel Allowance)</option>
                            <option value="Stationary">Stationary</option>
                            <option value="Office Expense">Office Expense</option>
                            <option value="Pantry">Pantry</option>
                            <option value="IT">IT</option>
                            <option value="Furniture">Furniture</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 mt-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Adjustment Form</p>
                            <p className="text-[9px] text-slate-700 italic font-medium">Add previously withdrawn bills</p>
                        </div>
                        <button
                            onClick={() => setIsAdjustment(!isAdjustment)}
                            className={`flex h-6 w-12 items-center rounded-full px-1 transition-colors ${isAdjustment ? 'bg-emerald-600' : 'bg-slate-300'}`}
                        >
                            <div className={`h-4 w-4 transform rounded-full bg-white transition-transform ${isAdjustment ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {isAdjustment && (
                        <div className="space-y-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                             <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                                <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">UB/Fin 02 Details</h3>
                                <button onClick={addAdjustmentRow} className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 flex items-center gap-1">
                                    <Plus size={12}/> Row
                                </button>
                            </div>
                            
                            {adjustmentItems.map((item, index) => (
                                <div key={index} className="flex gap-2 items-start relative bg-white p-2 rounded border border-emerald-100 shadow-sm relative group">
                                    <div className="flex-1 space-y-2">
                                        <input 
                                            type="text" 
                                            placeholder="Expenditure Details" 
                                            value={item.details} 
                                            onChange={e => updateAdjustmentRow(index, 'details', e.target.value)} 
                                            className="w-full text-xs p-1.5 border rounded outline-none focus:border-emerald-500"
                                        />
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                placeholder="Amount" 
                                                value={item.amount || ''} 
                                                onChange={e => updateAdjustmentRow(index, 'amount', parseFloat(e.target.value) || 0)} 
                                                className="w-20 text-xs p-1.5 border rounded outline-none focus:border-emerald-500"
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="Ref." 
                                                value={item.ref} 
                                                onChange={e => updateAdjustmentRow(index, 'ref', e.target.value)} 
                                                className="flex-1 text-xs p-1.5 border rounded outline-none focus:border-emerald-500"
                                            />
                                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 rounded border cursor-pointer hover:bg-slate-100">
                                                <input 
                                                    type="checkbox" 
                                                    checked={item.billsAttached} 
                                                    onChange={e => updateAdjustmentRow(index, 'billsAttached', e.target.checked)}
                                                    className="rounded text-emerald-600"
                                                /> Bills
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => removeAdjustmentRow(index)} 
                                        className="mt-1 text-slate-400 hover:text-red-500 p-1"
                                        title="Remove Row"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <div className="text-right text-[10px] font-black text-emerald-800 mr-8">
                                Total Adj: ₹{totalAdjustment.toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex gap-3">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex-1 bg-emerald-600 text-white font-bold text-xs py-2.5 rounded hover:bg-emerald-700 flex justify-center items-center gap-2 disabled:bg-emerald-400"
                    >
                        <Save size={14} /> {isSaving ? 'Saving...' : 'Save Requisition'}
                    </button>
                    <button 
                         onClick={handlePrint}
                         className="flex-1 bg-slate-800 text-white font-bold text-xs py-2.5 rounded hover:bg-slate-900 flex justify-center items-center gap-2"
                    >
                        <Printer size={14} /> Print Form
                    </button>
                </div>
            </div>

            {/* Print Preview Panel */}
            <div className="hidden lg:flex flex-1 bg-slate-200/50 border border-slate-200 rounded-lg shadow-inner justify-center overflow-y-auto relative p-8">
               <div ref={componentRef} className="w-[210mm] min-h-[297mm] bg-white text-black p-12 flex flex-col relative print:p-8" style={{ boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
                  
                  {/* --- Section 1: Form No. UB / Fin 01 --- */}
                  <div className="text-center w-full mb-6 relative">
                      <h1 className="font-black text-xl font-serif underline underline-offset-4 tracking-wider mb-2">URBANBUILD</h1>
                      <h2 className="font-bold text-sm mb-2">Requisition Form for Company-Related Expenses</h2>
                      <div className="inline-block border border-black rounded-full px-6 py-0.5 text-xs font-bold mb-2">
                          Form No. UB / Fin 01
                      </div>
                      <div className="inline-block border border-black rounded-full px-6 py-0.5 text-[10px] font-bold block mx-auto w-max">
                          Instructions:
                      </div>
                      <div className="border border-black mt-1 p-1 text-[10px] rounded italic text-center mx-12">
                          This form is to be filled by employees requesting advance funds for company related expenditures.
                      </div>
                      <p className="text-[9px] text-left mt-2 mx-12 font-medium">
                          <span className="font-bold underline">Note:</span> If the request is related to the adjustment of a previously unsettled amount, please fill Form No. UB/Fin02 (Adjustment Form) instead.
                      </p>
                  </div>

                  <div className="space-y-4 px-12 text-xs font-medium">
                      <div className="flex justify-between">
                          <div>Date: <span className="underline underline-offset-4">{header.date.split('-').reverse().join('-')}</span></div>
                          <div>Month: <span className="underline underline-offset-4 w-32 inline-block border-b border-black">{header.month}</span></div>
                      </div>

                      <div className="flex mt-6">
                            <span className="w-40 shrink-0">Name of Employee:</span>
                            <span className="flex-1 border-b border-dotted border-black">{header.employeeName}</span>
                      </div>
                      <div className="flex mt-3">
                            <span className="w-40 shrink-0">Designation:</span>
                            <span className="flex-1 border-b border-dotted border-black">{header.designation}</span>
                      </div>
                      <div className="flex mt-3">
                            <span className="w-40 shrink-0">Expenditure Register No. (ERN):</span>
                            <span className="flex-1 border-b border-dotted border-black">{header.ern}</span>
                      </div>
                      <div className="flex mt-3">
                            <span className="w-40 shrink-0">Amount Needed:</span>
                            <span className="flex-1 border-b border-dotted border-black font-bold">Rs. {header.amountNeeded || ''}</span>
                      </div>
                      <div className="flex mt-3 mb-6">
                            <span className="w-40 shrink-0">Money Previously drawn(unsettled):</span>
                            <span className="flex-1 border-b border-dotted border-black">Rs. {header.previouslyDrawn || ''}</span>
                      </div>

                      <div className="flex items-center gap-4 mt-6">
                          <span className="shrink-0">Purpose: </span>
                          <div className="flex items-center gap-3 flex-wrap">
                               {['TA', 'Stationary', 'Office Expense', 'Pantry', 'IT', 'Furniture'].map(p => (
                                   <label key={p} className="flex items-center gap-1 cursor-pointer">
                                       <div className={`w-3 h-3 border border-black flex items-center justify-center ${header.purpose === p ? 'bg-black text-white' : ''}`}>
                                           {header.purpose === p && <span className="text-[8px] leading-none">✓</span>}
                                       </div>
                                       {p}
                                   </label>
                               ))}
                          </div>
                      </div>

                      <div className="flex justify-between pt-16 mt-8 relative">
                          <div className="text-center">
                              <div className="w-40 border-b border-black mb-1"></div>
                              <span className="text-[10px]">Signature of Employee</span>
                          </div>
                          <div className="text-center">
                              <span className="text-[10px]">Account</span>
                          </div>
                      </div>

                      <div className="flex justify-between pt-12 mt-4 relative">
                          <div className="text-center">
                              <span className="text-[10px]">Recommended By</span>
                          </div>
                          <div className="text-center">
                              <span className="text-[10px]">Authority</span>
                          </div>
                      </div>
                  </div>

                  <hr className="border-black my-8" />

                  {/* --- Section 2: Form No. UB / Fin 02 --- */}
                  <div className="text-left w-full relative">
                      <h1 className="font-black text-sm font-serif mb-1">URBANBUILD</h1>
                      <h2 className="font-bold text-xs mb-2">Adjustment Form for Previously Withdrawn Amount</h2>
                      <div className="font-bold text-xs mb-4">Form No. UB/Fin02</div>
                      
                      <div className="flex justify-between text-xs font-medium px-4 mb-4">
                          <div>Month: <span className="underline underline-offset-4 w-32 inline-block border-b border-black">{header.month}</span></div>
                          <div>Date: <span className="underline underline-offset-4 w-32 inline-block border-b border-black">{header.date.split('-').reverse().join('-')}</span></div>
                      </div>

                      <table className="w-full text-xs border-collapse">
                          <thead>
                              <tr className="border border-black bg-slate-100/50">
                                  <th className="border border-black p-1.5 w-10 text-center">S.No</th>
                                  <th className="border border-black p-1.5 text-left">Expenditure Details</th>
                                  <th className="border border-black p-1.5 w-24 text-right">Amount</th>
                                  <th className="border border-black p-1.5 w-24 text-center">Bills Attached</th>
                                  <th className="border border-black p-1.5 w-24 text-center">Ref.</th>
                              </tr>
                          </thead>
                          <tbody>
                              {isAdjustment && adjustmentItems.length > 0 ? (
                                  adjustmentItems.map((item, i) => (
                                      <tr key={i} className="border border-black">
                                          <td className="border border-black p-1.5 text-center">{i + 1}</td>
                                          <td className="border border-black p-1.5">{item.details}</td>
                                          <td className="border border-black p-1.5 text-right">{item.amount || ''}</td>
                                          <td className="border border-black p-1.5 text-center font-bold">
                                              {item.billsAttached ? 'Yes' : 'No'}
                                          </td>
                                          <td className="border border-black p-1.5 text-center">{item.ref}</td>
                                      </tr>
                                  ))
                              ) : (
                                  [1, 2, 3, 4, 5].map(i => (
                                      <tr key={i} className="border border-black h-8">
                                          <td className="border border-black"></td>
                                          <td className="border border-black"></td>
                                          <td className="border border-black"></td>
                                          <td className="border border-black"></td>
                                          <td className="border border-black"></td>
                                      </tr>
                                  ))
                              )}
                              
                              {isAdjustment && adjustmentItems.length > 0 && (
                                   <tr className="border border-black font-bold bg-slate-50">
                                       <td colSpan={2} className="border border-black p-1.5 text-right">Total:</td>
                                       <td className="border border-black p-1.5 text-right">{totalAdjustment.toFixed(2)}</td>
                                       <td colSpan={2} className="border border-black"></td>
                                   </tr>
                              )}
                          </tbody>
                      </table>
                  </div>

               </div>
            </div>
        </div>
    );
}
