import { useState, useRef, useMemo, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// --- ALGORITHM: SHORTHAND EXTRACTION ---
const getShorthand = (str: string) => {
  if (!str || str.toLowerCase().includes("enter")) return "";
  const parts = str.trim().split(/\s+/);
  if (parts.length === 1 && parts[0].length <= 4) return parts[0].toUpperCase();
  return parts.map(word => word[0]).join("").toUpperCase();
};

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

export default function QuotationGenerator() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  const componentRef = useRef<HTMLDivElement>(null);
  const logoPath = '/Quotation-logo.png';
  
  const [isSaving, setIsSaving] = useState(false);
  const [divisions, setDivisions] = useState<any[]>([]);
  const isEditMode = location.pathname.includes('/edit/');

  const [header, setHeader] = useState({
    ubqn: '',
    ubSection: '',
    division_id: '',
    subCategory: '', 
    date: new Date().toISOString().split('T')[0], // Defaults to today
    client: '',
    division_display: '',
    department: '',
    address: '',
    subject: '',
    reference: '',
  });

  const [rows, setRows] = useState([
    { sn: '1', particular: '', rate: 0, unit: '', qty: 0, amount: 0 }
  ]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Quotation-${(header?.ubqn || '000').toString().replace(/\//g, '-')}`,
  });

  useEffect(() => {
    async function fetchDivisions() {
      const { data } = await supabase.from('divisions').select('*');
      if (data) setDivisions(data);
    }
    fetchDivisions();
  }, []);

  useEffect(() => {
    if (id) {
      const loadQuotationData = async () => {
        try {
          const db = supabase as any;
          const { data: quote, error: qError } = await db.from('quotations').select('*').eq('id', id).single();
          if (qError) throw qError;

          const { data: items, error: iError } = await db.from('quotation_items').select('*').eq('quotation_id', id).order('id', { ascending: true });
          if (iError) throw iError;

          setHeader({
            ubqn: quote.ubqn || '',
            ubSection: quote.section || '',
            division_id: quote.division_id || '',
            subCategory: quote.subcategory || '', 
            date: quote.quotation_date || '',
            client: quote.client_name || '',
            division_display: quote.division_name || '',
            department: quote.department_name || '',
            address: quote.address || '',
            subject: quote.subject || '',
            reference: quote.reference_no || '',
          });

          setRows(items.map((item: any) => ({
            sn: item.sn,
            particular: item.description,
            rate: Number(item.rate),
            unit: item.unit,
            qty: Number(item.qty),
            amount: Number(item.amount)
          })));
        } catch (error) {
          console.error("Error loading quotation:", error);
        }
      };
      loadQuotationData();
    }
  }, [id]);

  const updateRow = (index: number, field: string, value: any) => {
    setRows(prevRows => {
      const newRows = [...prevRows];
      const updatedRow = { ...newRows[index], [field]: value };
      if (field === 'rate' || field === 'qty') {
        const r = parseFloat(field === 'rate' ? value : updatedRow.rate) || 0;
        const q = parseFloat(field === 'qty' ? value : updatedRow.qty) || 0;
        updatedRow.amount = r * q;
      }
      newRows[index] = updatedRow;
      return newRows;
    });
  };

  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + (row.amount || 0), 0), [rows]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const snA = (a.sn || '').toString();
      const snB = (b.sn || '').toString();
      return snA.localeCompare(snB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [rows]);

  const handleGenerateAndSync = async () => {
    if (id && !isEditMode) return handlePrint();
    if (!header.division_id) return alert("Please select a valid Division.");
    if (header.ubSection === 'RnB' && !header.subCategory) return alert("Please select Road or Bridge sub-type.");

    setIsSaving(true);
    try {
      const db = supabase as any;
      let currentQuoteId = id;

      const cleanUBQN = header.ubqn.split('/')[0].trim();
      const divShort = getShorthand(header.division_display);
      const reflectedClient = [divShort, header.department, header.address].filter(Boolean).join(" ");
      const reflectedWorkName = rows[0]?.particular || header.subject;

      const quotePayload = {
        ubqn: header.ubqn,
        section: header.ubSection,
        subcategory: header.subCategory || null,
        quotation_date: header.date || null,
        client_name: header.client,
        division_name: header.division_display,
        department_name: header.department,
        address: header.address,
        subject: header.subject,
        reference_no: header.reference,
        consultancy_cost: totalAmount,
        division_id: header.division_id
      };

      if (isEditMode && id) {
        await db.from('quotations').update(quotePayload).eq('id', id);
        await db.from('quotation_items').delete().eq('quotation_id', id);
      } else {
        const { data: quote, error: qInsertError } = await db.from('quotations').insert(quotePayload).select().single();
        if (qInsertError) throw qInsertError;
        currentQuoteId = quote.id;
      }

      const lineItems = rows.map(row => ({
        quotation_id: currentQuoteId,
        sn: row.sn,
        description: row.particular,
        rate: row.rate,
        unit: row.unit,
        qty: row.qty,
        amount: row.amount
      }));
      await db.from('quotation_items').insert(lineItems);

      const { error: workError } = await db.from('works').upsert({
        ubqn: cleanUBQN,
        work_name: reflectedWorkName,
        client_name: reflectedClient,
        consultancy_cost: totalAmount,
        division_id: header.division_id,
        status: 'Pipeline',
        subcategory: header.ubSection === 'RnB' ? header.subCategory : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'ubqn' });

      if (workError) throw workError;

      handlePrint();
      navigate('/quotations');
    } catch (error: any) {
      alert("Sync Algorithm Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] bg-slate-50 p-4 font-sans">
      <div className="w-full lg:w-1/3 bg-white p-5 rounded-lg shadow-sm border border-slate-200 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/quotations')} className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="bg-blue-600 text-white p-1 rounded">
                {isEditMode ? <Save size={14}/> : <Plus size={14}/>}
            </span> 
            {isEditMode ? 'Edit Mode' : id ? 'Reprint Mode' : 'New Quotation'}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">UBQN No</label>
              <input type="text" value={header.ubqn} onChange={e => setHeader({...header, ubqn: e.target.value})} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">UB Sector</label>
              <select 
                value={header.division_id} 
                onChange={e => {
                  const selected = divisions.find(d => d.id === e.target.value);
                  setHeader({
                    ...header, 
                    division_id: e.target.value, 
                    division_display: selected?.name || '', 
                    ubSection: selected?.code || '',
                    subCategory: '' 
                  });
                }} 
                className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Sector</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          {header.ubSection === 'RnB' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <label className="block text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">
                RnB Sub-Type Selection <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setHeader({ ...header, subCategory: 'Road' })}
                  className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${header.subCategory === 'Road' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-100'}`}>ROAD</button>
                <button type="button" onClick={() => setHeader({ ...header, subCategory: 'Bridge' })}
                  className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${header.subCategory === 'Bridge' ? 'bg-cyan-600 text-white border-cyan-600 shadow-md' : 'bg-white text-cyan-600 border-cyan-200 hover:bg-cyan-100'}`}>BRIDGE</button>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Date</label>
            <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>

          <div className="border-t pt-3 space-y-3">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Recipient Details</p>
            <input type="text" placeholder="Recipient Title" value={header.client} onChange={e => setHeader({...header, client: e.target.value})} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
            <input type="text" placeholder="Division Name" value={header.division_display} onChange={e => setHeader({...header, division_display: e.target.value})} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
            <input type="text" placeholder="Department" value={header.department} onChange={e => setHeader({...header, department: e.target.value})} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
            <input type="text" placeholder="Address / Location" value={header.address} onChange={e => setHeader({...header, address: e.target.value})} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
          </div>

          <div className="border-t pt-3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Subject</label>
            <input type="text" value={header.subject} onChange={e => setHeader({...header, subject: e.target.value})} className="w-full border p-2 rounded text-xs outline-none" />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-xs text-slate-700">Service Particulars</h3>
            <button onClick={() => setRows([...rows, { sn: (rows.length + 1).toString(), particular: '', rate: 0, unit: '', qty: 0, amount: 0 }])} className="text-[10px] font-bold flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
              <Plus size={12} /> Add Row
            </button>
          </div>
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={index} className="bg-slate-50 p-2 rounded border border-slate-200 relative group">
                <button onClick={() => setRows(rows.filter((_, i) => i !== index))} className="absolute top-1 right-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                <div className="flex gap-2 mb-2">
                  <input placeholder="SN" value={row.sn} onChange={e => updateRow(index, 'sn', e.target.value)} className="w-12 border p-1 rounded text-xs text-center" />
                  <textarea placeholder="Description" value={row.particular} onChange={e => updateRow(index, 'particular', e.target.value)} className="flex-1 border p-1 rounded text-xs" rows={2} />
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <input type="number" placeholder="Rate" value={row.rate || ''} onChange={e => updateRow(index, 'rate', e.target.value)} className="border p-1 rounded text-xs" />
                  <input placeholder="Unit" value={row.unit} onChange={e => updateRow(index, 'unit', e.target.value)} className="border p-1 rounded text-xs" />
                  <input type="number" placeholder="Qty" value={row.qty || ''} onChange={e => updateRow(index, 'qty', e.target.value)} className="border p-1 rounded text-xs" />
                  <div className="bg-white border p-1 rounded text-xs font-bold text-right flex items-center justify-end px-1">{row.amount.toLocaleString('en-IN')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleGenerateAndSync} disabled={isSaving} className="w-full mt-6 bg-blue-800 text-white py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-blue-900 font-bold text-sm shadow-md transition-all">
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />} 
          {isEditMode ? "Update & Print" : id ? "Reprint PDF" : "Generate Quotation"}
        </button>
      </div>

      <div className="flex-1 bg-gray-200 rounded-lg border border-gray-300 flex justify-center overflow-auto p-8">
        <div ref={componentRef} className="bg-white shadow-2xl flex flex-col relative print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
          
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <img src={logoPath} alt="Logo" className="w-24 object-contain" />
              <div>
                <h1 className="text-3xl font-black text-[#1a3f85] tracking-tight leading-none">URBANBUILD<span className="text-[9px] font-medium align-top ml-0.5">TM</span></h1>
                <p className="text-[#1a3f85] font-bold text-sm tracking-widest uppercase mt-1">Design • Consultancy • Construction</p>
              </div>
            </div>
            <div className="text-right pt-2 text-[#1a3f85]">
              <p className="text-xs font-bold">GSTIN: 05BSSPT0457K1Z4</p>  
              <p className="text-sm font-bold text-slate-800">📞 82917 22917</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 py-1 px-2 text-center text-[9px] mb-2 uppercase font-bold tracking-wider">
            <span className="text-slate-700">Associate Partner:</span> <span className="text-red-600 ml-1">Civil Tech Laboratory</span> <span className="text-slate-500">(NABL accredited, ISO certified)</span>
          </div>

          <div className="text-[9px] text-center text-slate-600 border-b border-[#1a3f85] pb-2 mb-4 leading-tight">
            <p>HO: Bhaniyawala Tiraha, Jollygrant, Dehradun(UK)-248016</p>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between font-bold text-xs mb-4 text-slate-800">
              <p>L.N.: {header.ubqn}</p>
              <p>Date: {header.date ? header.date.split('-').reverse().join('/') : '__/__/____'}</p>
            </div>

            <div className="mb-4 text-sm font-semibold text-slate-900 leading-snug">
              To,<br/>
              {header.client}<br/>
              {header.division_display}<br/>
              {header.department}<br/>
              {header.address}
            </div>

            <div className="mb-1 text-sm font-bold uppercase text-slate-900">Sub: {header.subject}</div>

            <div className="mb-3 text-sm text-slate-800 mt-4">
              <p>Respected Sir,</p>
              <p className="mt-1">With due regards, please find below the quotation for your perusal:</p>
            </div>

            <table className="w-full border-collapse border border-slate-900 text-xs mb-2">
              <thead className="bg-slate-100 font-bold uppercase">
                <tr>
                  <th className="border border-slate-900 py-2 w-10 text-center">SN</th>
                  <th className="border border-slate-900 py-2 px-2 text-left">Particulars</th>
                  <th className="border border-slate-900 py-2 w-20 text-center">Rate</th>
                  <th className="border border-slate-900 py-2 w-16 text-center">Unit</th>
                  <th className="border border-slate-900 py-2 w-14 text-center">Qty</th>
                  <th className="border border-slate-900 py-2 px-2 w-24 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((item, index) => {
                  const snStr = (item.sn || '').toString();
                  const isSubItem = snStr.includes('.');

                  const formatVal = (val: any) => {
                    const num = parseFloat(val);
                    if (isNaN(num) || num === 0) return "-";
                    return num.toLocaleString('en-IN');
                  };

                  return (
                    <tr key={index}>
                      <td className="border border-slate-900 py-2 text-center align-top font-medium">{snStr || "-"}</td>
                      <td className={`border border-slate-900 py-2 px-2 align-top whitespace-pre-wrap leading-snug ${isSubItem ? "pl-6" : "font-bold"}`}>
                        {item.particular || "-"}
                      </td>
                      <td className="border border-slate-900 py-2 text-center align-top">{formatVal(item.rate)}</td>
                      <td className="border border-slate-900 py-2 text-center align-top">{item.unit || "-"}</td>
                      <td className="border border-slate-900 py-2 text-center align-top">{formatVal(item.qty)}</td>
                      <td className="border border-slate-900 py-2 px-2 text-right align-top font-bold">
                        {item.amount > 0 ? item.amount.toLocaleString('en-IN') : "-"}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td colSpan={5} className="border border-slate-900 py-2 px-2 text-right uppercase text-[10px] tracking-wider">Total Quoted Amount:</td>
                  <td className="border border-slate-900 py-2 px-2 text-right">₹ {totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div className="mb-4 text-[11px] font-bold text-slate-800 italic uppercase">
              Amount in words: {numberToWordsIndian(totalAmount)}
            </div>

            <p className="text-[10px] font-bold underline mb-4 italic text-slate-600">Note: GST as applicable will be extra.</p>
           
            <div className="mt-auto flex justify-end pr-4 mb-2">
              <div className="text-left">
                <p className="text-xs mb-2 font-medium">Yours Sincerely,</p>
                <p className="font-bold text-xs uppercase text-[#1a3f85]">For URBANBUILD™</p>
                <p className="font-bold text-xs mt-1 text-slate-900">Er. Naveen Kumar</p>
                <p className="text-[10px] font-medium text-slate-700">Assistant Director</p>
                <p className="text-[10px] font-medium text-slate-700">(Design & Consultancy)</p>
              </div>
            </div>

            <div className="text-center mb-1">
                <p className="text-[9px] font-bold text-slate-500">**This is a computer Generated quote and does not require Signature.**</p>
            </div>
          </div>

          <div className="border-t border-[#1a3f85] pt-2 text-[11px] text-center text-slate-500 italic">
            "IT Applications Developed by: Aetroniq Digital & Automation Services. (Powered By URBANBUILD™)
          </div>
        </div>
      </div>
    </div>
  );
}



