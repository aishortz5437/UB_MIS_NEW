import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Plus, Trash2, ArrowLeft, Search, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// --- HELPER: CONVERT NUMBER TO INDIAN WORDS ---
const numberToWordsIndian = (num: number): string => {
    if (num === 0) return 'Zero';
    const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const formatLessThanThousand = (n: number): string => {
        let str = "";
        if (n > 99) {
            str += single[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n > 9 && n < 20) {
            str += double[n - 10] + " ";
        } else {
            str += tens[Math.floor(n / 10)] + " " + single[n % 10] + " ";
        }
        return str.trim();
    };

    let res = "";
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;

    if (crore > 0) res += formatLessThanThousand(crore) + " Crore ";
    if (lakh > 0) res += formatLessThanThousand(lakh) + " Lakh ";
    if (thousand > 0) res += formatLessThanThousand(thousand) + " Thousand ";
    if (num > 0) res += formatLessThanThousand(num);

    return res.trim() + " Only";
};

export default function InvoiceGenerator() {
    const navigate = useNavigate();
    const componentRef = useRef<HTMLDivElement>(null);
    const logoPath = '/Quotation-logo.png';

    const [ubqn, setUbqn] = useState('');
    const [ubqnStatus, setUbqnStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
    const [recentQuotes, setRecentQuotes] = useState<any[]>([]);

    useEffect(() => {
        const fetchRecent = async () => {
            const { data } = await (supabase as any)
                .from('quotations')
                .select('ubqn, client_name, subject')
                .order('created_at', { ascending: false })
                .limit(5);
            if (data) setRecentQuotes(data);
        };
        fetchRecent();
    }, []);

    const lookupUBQN = useCallback(async (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) { setUbqnStatus('idle'); return; }
        setUbqnStatus('loading');
        try {
            const db = supabase as any;

            // Try exact match first, then suffix match
            let { data: quote, error } = await db.from('quotations').select('*').eq('ubqn', trimmed).single();

            if (!quote) {
                // If not found, try searching by the number suffix (e.g. if user types 123 find RnB (Q)- 123)
                const { data: matches } = await db.from('quotations')
                    .select('*')
                    .ilike('ubqn', `%- ${trimmed}`)
                    .limit(1);
                
                if (matches && matches.length > 0) {
                    quote = matches[0];
                }
            }

            if (error || !quote) { setUbqnStatus('not_found'); return; }

            // Auto-fill header
            setHeader(prev => ({
                ...prev,
                firm: quote.firm || prev.firm,
                ref: quote.reference_no || '',
            }));

            // Auto-fill bill-to
            setBillTo(prev => ({
                ...prev,
                name: quote.client_name || '',
                address: quote.address || '',
            }));

            // Fetch line items
            const { data: qItems } = await db.from('quotation_items').select('*').eq('quotation_id', quote.id).order('id', { ascending: true });
            if (qItems && qItems.length > 0) {
                const mappedItems = qItems.map((item: any) => ({
                    sn: String(item.sn || ''),
                    description: item.description || '',
                    code: '',
                    amount: Number(item.amount) || 0,
                }));

                mappedItems.sort((a: any, b: any) => {
                    const snA = (a.sn || '').toString();
                    const snB = (b.sn || '').toString();
                    return snA.localeCompare(snB, undefined, { numeric: true, sensitivity: 'base' });
                });

                setItems(mappedItems);
            }

            setUbqnStatus('found');
        } catch {
            setUbqnStatus('not_found');
        }
    }, []);

    const [header, setHeader] = useState({
        firm: 'URBANBUILD™',
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        ref: '',
        refDate: '',
        reverseCharge: 'No',
        state: 'Uttarakhand',
    });

    const [billTo, setBillTo] = useState({
        name: '',
        address: '',
        gstin: '',
        state: 'Uttarakhand',
    });

    const [shipTo, setShipTo] = useState({
        enabled: false,
        name: '',
        address: '',
        gstin: '',
        state: '',
    });

    const [items, setItems] = useState([
        { sn: '1', description: '', code: '', amount: 0 }
    ]);

    const [gstType, setGstType] = useState<'intra' | 'inter'>('intra'); // intra = SGST+CGST, inter = IGST
    const [gstRate, setGstRate] = useState(9); // 9% each for SGST/CGST, or 18% for IGST

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Invoice-${(header?.invoiceNumber || '000').replace(/\//g, '-')}`,
    });

    const totalAmount = useMemo(() => items.reduce((sum, item) => sum + (item.amount || 0), 0), [items]);
    const taxableValue = totalAmount;

    const sgst = useMemo(() => gstType === 'intra' ? Math.round((taxableValue * gstRate / 100) * 100) / 100 : 0, [taxableValue, gstRate, gstType]);
    const cgst = useMemo(() => gstType === 'intra' ? Math.round((taxableValue * gstRate / 100) * 100) / 100 : 0, [taxableValue, gstRate, gstType]);
    const igst = useMemo(() => gstType === 'inter' ? Math.round((taxableValue * (gstRate * 2) / 100) * 100) / 100 : 0, [taxableValue, gstRate, gstType]);

    const totalWithTax = taxableValue + sgst + cgst + igst;
    const grandTotal = Math.round(totalWithTax);
    const roundOff = Math.round((grandTotal - totalWithTax) * 100) / 100;

    const updateItem = (index: number, field: string, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });
    };

    const formatINR = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] bg-slate-50 p-4 font-sans">
            {/* ===== LEFT PANEL: FORM ===== */}
            <div className="w-full lg:w-1/3 bg-white p-5 rounded-lg shadow-sm border border-slate-200 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-amber-600">
                        <ArrowLeft size={14} /> Back
                    </button>
                    <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <span className="bg-amber-600 text-white p-1 rounded">
                            <Plus size={14} />
                        </span>
                        New Invoice
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    {/* UBQN Lookup */}
                    <div>
                        <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider">UBQN (Auto-Fill)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={ubqn}
                                onChange={e => setUbqn(e.target.value)}
                                onBlur={() => lookupUBQN(ubqn)}
                                onKeyDown={e => { if (e.key === 'Enter') lookupUBQN(ubqn); }}
                                className="w-full border p-2 pr-8 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-none font-mono"
                                placeholder="Enter UBQN to auto-fill details..."
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                {ubqnStatus === 'loading' && <Search size={14} className="text-amber-500 animate-pulse" />}
                                {ubqnStatus === 'found' && <CheckCircle2 size={14} className="text-green-500" />}
                                {ubqnStatus === 'not_found' && <XCircle size={14} className="text-red-400" />}
                            </div>
                        </div>
                        {ubqnStatus === 'found' && <p className="text-[9px] text-green-600 mt-0.5">✓ Quotation found — fields auto-filled</p>}
                        {ubqnStatus === 'not_found' && <p className="text-[9px] text-red-400 mt-0.5">No matching quotation found</p>}

                        {/* Recent Suggestions */}
                        {recentQuotes.length > 0 && ubqnStatus !== 'found' && (
                            <div className="mt-2 p-2 bg-amber-50/50 rounded-lg border border-amber-100">
                                <p className="text-[9px] font-bold text-amber-600 uppercase mb-1.5 px-1">Recent Quotations</p>
                                <div className="space-y-1">
                                    {recentQuotes.map((q, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => {
                                                const displayNum = q.ubqn.includes('-') ? q.ubqn.split('-').pop()?.trim() : q.ubqn;
                                                setUbqn(displayNum);
                                                lookupUBQN(q.ubqn);
                                            }}
                                            className="w-full text-left p-1.5 hover:bg-white rounded transition-colors group flex items-start gap-2"
                                        >
                                            <span className="text-[10px] font-black text-amber-700 bg-white px-1.5 py-0.5 rounded border border-amber-100 shrink-0">
                                                {q.ubqn.includes('-') ? q.ubqn.split('-').pop()?.trim() : q.ubqn}
                                            </span>
                                            <span className="text-[10px] text-slate-600 truncate group-hover:text-amber-600">
                                                {q.client_name || q.subject}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Firm */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Firm</label>
                        <select value={header.firm} onChange={e => setHeader({ ...header, firm: e.target.value })}
                            className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-none">
                            <option value="URBANBUILD™">URBANBUILD™</option>
                            <option value="URBANBUILD™ Pvt. Ltd.">URBANBUILD™ Pvt. Ltd.</option>
                        </select>
                    </div>

                    {/* Invoice No + Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Invoice Number</label>
                            <input type="text" value={header.invoiceNumber} onChange={e => setHeader({ ...header, invoiceNumber: e.target.value })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-none" placeholder="BR/PD PWD LDN/GAR/263 (2F)" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Invoice Date</label>
                            <input type="date" value={header.invoiceDate} onChange={e => setHeader({ ...header, invoiceDate: e.target.value })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-none" />
                        </div>
                    </div>

                    {/* Ref + Ref Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Ref</label>
                            <input type="text" value={header.ref} onChange={e => setHeader({ ...header, ref: e.target.value })} className="w-full border p-2 rounded text-xs outline-none" placeholder="e.g. 48/EE" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Ref Date</label>
                            <input type="date" value={header.refDate} onChange={e => setHeader({ ...header, refDate: e.target.value })} className="w-full border p-2 rounded text-xs outline-none" />
                        </div>
                    </div>

                    {/* State*/}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">State</label>
                            <input type="text" value={header.state} onChange={e => setHeader({ ...header, state: e.target.value })} className="w-full border p-2 rounded text-xs outline-none" />
                        </div>
                    </div>

                    {/* Bill To Party */}
                    <div className="border-t pt-3 space-y-2">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Bill To Party</p>
                        <input type="text" placeholder="Name" value={billTo.name} onChange={e => setBillTo({ ...billTo, name: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                        <input type="text" placeholder="Address" value={billTo.address} onChange={e => setBillTo({ ...billTo, address: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input type="text" placeholder="GSTIN" value={billTo.gstin} onChange={e => setBillTo({ ...billTo, gstin: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                            <input type="text" placeholder="State" value={billTo.state} onChange={e => setBillTo({ ...billTo, state: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                        </div>
                    </div>

                    {/* Ship To Party (Optional) */}
                    <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="shipToEnabled" checked={shipTo.enabled} onChange={e => setShipTo({ ...shipTo, enabled: e.target.checked })} className="rounded" />
                            <label htmlFor="shipToEnabled" className="text-[10px] font-bold text-amber-600 uppercase tracking-wider cursor-pointer">Tick if shipping address is different from Bill Address</label>
                        </div>
                        {shipTo.enabled && (
                            <div className="space-y-2 pl-1">
                                <input type="text" placeholder="Name" value={shipTo.name} onChange={e => setShipTo({ ...shipTo, name: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                                <input type="text" placeholder="Address" value={shipTo.address} onChange={e => setShipTo({ ...shipTo, address: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input type="text" placeholder="GSTIN" value={shipTo.gstin} onChange={e => setShipTo({ ...shipTo, gstin: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                                    <input type="text" placeholder="State" value={shipTo.state} onChange={e => setShipTo({ ...shipTo, state: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* GST Settings */}
                    <div className="border-t pt-3 space-y-2">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">GST Settings</p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setGstType('intra')}
                                className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${gstType === 'intra' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-100'}`}>
                                SGST + CGST (Intra-State)
                            </button>
                            <button type="button" onClick={() => setGstType('inter')}
                                className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${gstType === 'inter' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-100'}`}>
                                IGST (Inter-State)
                            </button>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">GST Rate (%){gstType === 'intra' ? ' (each for SGST & CGST)' : ''}</label>
                            <input type="number" value={gstRate} onChange={e => setGstRate(parseFloat(e.target.value) || 0)} className="w-full border p-2 rounded text-xs outline-none" />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="border-t pt-3">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-xs text-slate-700">Line Items</h3>
                            <button onClick={() => setItems([...items, { sn: (items.length + 1).toString(), description: '', code: '', amount: 0 }])} className="text-[10px] font-bold flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 transition-colors">
                                <Plus size={12} /> Add Item
                            </button>
                        </div>
                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="bg-slate-50 p-2 rounded border border-slate-200 relative group">
                                    <button onClick={() => setItems(items.filter((_, i) => i !== index))} className="absolute top-1 right-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                                    <div className="flex gap-2 mb-2">
                                        <input placeholder="SN" value={item.sn} onChange={e => updateItem(index, 'sn', e.target.value)} className="w-12 border p-1 rounded text-xs text-center" />
                                        <textarea placeholder="Description" value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} className="flex-1 border p-1 rounded text-xs" rows={2} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                        <input placeholder="HSN/SAC Code" value={item.code} onChange={e => updateItem(index, 'code', e.target.value)} className="border p-1 rounded text-xs" />
                                        <input type="number" placeholder="Amount" value={item.amount || ''} onChange={e => updateItem(index, 'amount', parseFloat(e.target.value) || 0)} className="border p-1 rounded text-xs" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="border-t pt-3 bg-amber-50 rounded-lg p-3 space-y-1 text-xs">
                        {gstType === 'intra' ? (
                            <>
                                <div className="flex justify-between"><span className="text-slate-600">SGST @{gstRate}%:</span><span className="font-bold">₹ {formatINR(sgst)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-600">CGST @{gstRate}%:</span><span className="font-bold">₹ {formatINR(cgst)}</span></div>
                            </>
                        ) : (
                            <div className="flex justify-between"><span className="text-slate-600">IGST @{gstRate * 2}%:</span><span className="font-bold">₹ {formatINR(igst)}</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-slate-600">Round Off:</span><span className="font-bold">₹ {roundOff >= 0 ? '+' : ''}{roundOff.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t pt-1 text-sm"><span className="font-bold text-slate-800">Grand Total:</span><span className="font-extrabold text-amber-700">₹ {grandTotal.toLocaleString('en-IN')}</span></div>
                    </div>
                </div>

                {/* Generate Button */}
                <button onClick={() => handlePrint()} className="w-full mt-4 bg-amber-700 text-white py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-amber-800 font-bold text-sm shadow-md transition-all">
                    <Printer size={16} />
                    Print Invoice
                </button>
            </div>

            {/* ===== RIGHT PANEL: A4 PREVIEW ===== */}
            <div className="flex-1 bg-gray-200 rounded-lg border border-gray-300 flex justify-center overflow-auto p-8">
                <div ref={componentRef} className="bg-white shadow-2xl flex flex-col relative print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '12mm 15mm' }}>

                    {/* HEADER */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                            <img src={logoPath} alt="Logo" className="w-24 object-contain" />
                            <div>
                                <h1 className="text-3xl font-black text-[#1a3f85] tracking-tight leading-none">
                                    {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? (
                                        <>URBANBUILD<span className="text-[9px] font-medium align-top ml-0.5">TM</span> Pvt. Ltd.</>
                                    ) : (
                                        <>URBANBUILD<span className="text-[9px] font-medium align-top ml-0.5">TM</span></>
                                    )}
                                </h1>
                                <p className="text-[#1a3f85] font-bold text-sm tracking-widest uppercase mt-1">Design • Consultancy • Construction</p>
                            </div>
                        </div>
                        <div className="text-right pt-2 text-[#1a3f85]">
                            <p className="text-xs font-bold">GSTIN: {header.firm === 'URBANBUILD™' ? '05BSSPT0457K1Z4' : '05AADCUR305Q1ZW'}</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 py-1 px-2 text-center text-[9px] mb-1 uppercase font-bold tracking-wider">
                        <span className="text-slate-700">Associate Partner:</span> <span className="text-red-600 ml-1">Civil Tech Laboratory</span> <span className="text-slate-500">(NABL accredited, ISO certified)</span>
                    </div>
                    <div className="text-[9px] text-center text-slate-600 border-b border-[#1a3f85] pb-1 mb-3 leading-tight">
                        <p>RO: Bhaniyawala Tiraha, Jollygrant Dehradun, 248140</p>
                    </div>

                    {/* INVOICE TITLE */}
                    <div className="bg-[#1a3f85] text-white text-center py-2 font-bold text-sm tracking-[0.3em] uppercase mb-4 rounded-sm">
                        INVOICE
                    </div>

                    {/* INVOICE META — clean inline layout */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[10px] mb-4 pb-3 border-b border-slate-200">
                        <div className="flex gap-2">
                            <span className="font-bold text-slate-500 w-20 shrink-0">Invoice No.</span>
                            <span className="font-semibold text-slate-900">{header.invoiceNumber || '—'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold text-slate-500 w-20 shrink-0">Ref:</span>
                            <span className="font-semibold text-slate-900">{header.ref}{header.refDate ? ` dated ${header.refDate.split('-').reverse().join('/')}` : ''}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold text-slate-500 w-20 shrink-0">Invoice Date</span>
                            <span className="font-semibold text-slate-900">{header.invoiceDate ? header.invoiceDate.split('-').reverse().join('/') : '—'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold text-slate-500 w-20 shrink-0">State</span>
                            <span className="font-semibold text-slate-900">{header.state}</span>
                        </div>
                    </div>

                    {/* BILL TO / SHIP TO — card style */}
                    <div className={`grid ${shipTo.enabled ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-4`}>
                        <div className="bg-slate-50 rounded p-3">
                            <p className="text-[9px] font-bold text-[#1a3f85] uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Bill To</p>
                            <div className="text-[10px] space-y-0.5 text-slate-800">
                                <p className="font-bold">{billTo.name || '—'}</p>
                                <p>{billTo.address || '—'}</p>
                                {billTo.gstin && <p className="text-slate-500">GSTIN: <span className="font-semibold text-slate-700">{billTo.gstin}</span></p>}
                                <p className="text-slate-500">State: <span className="font-semibold text-slate-700">{billTo.state || '—'}</span></p>
                            </div>
                        </div>
                        {shipTo.enabled && (
                            <div className="bg-slate-50 rounded p-3">
                                <p className="text-[9px] font-bold text-[#1a3f85] uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Ship To</p>
                                <div className="text-[10px] space-y-0.5 text-slate-800">
                                    <p className="font-bold">{shipTo.name || '—'}</p>
                                    <p>{shipTo.address || '—'}</p>
                                    {shipTo.gstin && <p className="text-slate-500">GSTIN: <span className="font-semibold text-slate-700">{shipTo.gstin}</span></p>}
                                    <p className="text-slate-500">State: <span className="font-semibold text-slate-700">{shipTo.state || '—'}</span></p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* LINE ITEMS — minimal table */}
                    <table className="w-full text-[10px] mb-1">
                        <thead>
                            <tr className="border-b-2 border-[#1a3f85] text-[9px] uppercase tracking-wider text-slate-500">
                                <th className="py-2 w-10 text-center font-bold">S.N.</th>
                                <th className="py-2 px-2 text-left font-bold">Description</th>
                                <th className="py-2 w-20 text-center font-bold">Code</th>
                                <th className="py-2 w-24 text-right pr-1 font-bold">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index} className="border-b border-slate-200">
                                    <td className="py-2 text-center align-top text-slate-600">{item.sn || '-'}</td>
                                    <td className="py-2 px-2 align-top whitespace-pre-wrap leading-snug text-slate-800">{item.description || '-'}</td>
                                    <td className="py-2 text-center align-top text-slate-600">{item.code || '-'}</td>
                                    <td className="py-2 text-right align-top font-semibold pr-1">{item.amount > 0 ? formatINR(item.amount) : '-'}</td>
                                </tr>
                            ))}
                            <tr className="border-b-2 border-[#1a3f85]">
                                <td colSpan={3} className="py-2 text-right uppercase text-[9px] tracking-wider font-bold text-slate-500 pr-2">Total</td>
                                <td className="py-2 text-right font-bold text-slate-900 pr-1">{formatINR(totalAmount)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* TAX SUMMARY — right-aligned clean rows */}
                    <div className="flex justify-end mb-3">
                        <div className="w-56 text-[10px]">
                            {gstType === 'intra' ? (
                                <>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500">SGST @{gstRate}%</span>
                                        <span className="font-semibold">{formatINR(sgst)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500">CGST @{gstRate}%</span>
                                        <span className="font-semibold">{formatINR(cgst)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span className="text-slate-500">IGST @{gstRate * 2}%</span>
                                    <span className="font-semibold">{formatINR(igst)}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Round off</span>
                                <span className="font-semibold">{roundOff >= 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-t-2 border-[#1a3f85] mt-1">
                                <span className="font-bold text-sm text-slate-900">Grand Total</span>
                                <span className="font-black text-sm text-[#1a3f85]">₹ {grandTotal.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Amount in Words */}
                    <div className="bg-blue-50 rounded px-3 py-2 mb-4 text-[10px]">
                        <span className="text-slate-500 font-bold uppercase text-[9px]">Amount in words: </span>
                        <span className="font-bold italic text-slate-800">Rs. {numberToWordsIndian(grandTotal)} Rupees</span>
                    </div>

                    {/* Bank + Certification — clean two-column */}
                    <div className="flex gap-0 mb-4 border-t border-slate-200 pt-3">
                        <div className="flex-1 text-[10px] pr-4">
                            <p className="font-bold text-[9px] text-[#1a3f85] uppercase tracking-wider mb-1.5">Bank Details</p>
                            <p className="font-semibold text-slate-800">Indian Overseas Bank</p>
                            <p className="text-slate-600 leading-snug">305 PHASE II VASANTH VIHAR P.O.F.R.I.<br />DEHRADUN PIN : 248001</p>
                            <p className="font-bold text-slate-800 mt-1">A/C: 055 202 000 00 1619</p>
                            <p className="font-bold text-slate-800">IFSC: IOBA0000552</p>
                        </div>
                        <div className="flex-1 pl-4 border-l border-slate-200 text-[10px] flex flex-col justify-between">
                            <p className="text-center italic text-slate-500 text-[9px] mt-2">Certified that the particulars given above are true and correct</p>
                            <div className="text-right mt-6">
                                <p className="font-bold text-[#1a3f85]">For {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? 'UrbanBuild Pvt. Ltd.' : 'UrbanBuild'}</p>
                                <p className="text-[9px] text-slate-400 mt-1">Authorised Signatory</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#1a3f85] pt-2 text-[11px] text-center text-slate-500 italic mt-auto">
                        "IT Applications Developed by: Aetroniq Digital & Automation Services. (Powered By URBANBUILD™)
                    </div>
                </div>
            </div>
        </div>
    );
}
