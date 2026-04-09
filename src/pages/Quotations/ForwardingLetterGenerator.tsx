import { useState, useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Plus, Trash2, ArrowLeft, Search, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function ForwardingLetterGenerator() {
    const navigate = useNavigate();
    const componentRef = useRef<HTMLDivElement>(null);
    const logoPath = '/Quotation-logo.png';

    const [ubqn, setUbqn] = useState('');
    const [ubqnStatus, setUbqnStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');

    const lookupUBQN = useCallback(async (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) { setUbqnStatus('idle'); return; }
        setUbqnStatus('loading');
        try {
            const db = supabase as any;
            const { data: quote, error } = await db.from('quotations').select('*').eq('ubqn', trimmed).single();
            if (error || !quote) { setUbqnStatus('not_found'); return; }

            setHeader(prev => ({
                ...prev,
                firm: quote.firm || prev.firm,
                subsidiary: (quote as any).subsidiary || '',
                ubSection: quote.section || '',
                subCategory: quote.subcategory || '',
                recipientTitle: quote.client_name || '',
                recipientDivision: quote.division_name || '',
                recipientDepartment: quote.department_name || '',
                recipientAddress: quote.address || '',
                subject: quote.subject || '',
            }));

            setUbqnStatus('found');
        } catch {
            setUbqnStatus('not_found');
        }
    }, []);

    const [header, setHeader] = useState({
        firm: 'URBANBUILD™',
        subsidiary: '',
        ubSection: '',
        subCategory: '',
        letterNumber: '',
        date: new Date().toISOString().split('T')[0],
        recipientTitle: '',
        recipientDivision: '',
        recipientDepartment: '',
        recipientAddress: '',
        subject: '',
        bodyText: 'With due regards we are sending you hardcopy of ',
        docType: 'Quotation',
    });

    const [attachments, setAttachments] = useState([
        { id: 1, text: '' },
    ]);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `${header.docType || 'ForwardingLetter'}-${(header?.letterNumber?.startsWith('UBQN') ? header.letterNumber : (header.ubSection ? `UBQN ${header.ubSection === 'Ar' ? 'Arch' : header.ubSection} (${header.docType === 'Tender' ? 'T' : header.docType === 'HR' ? 'H' : 'Q'})- ${header.letterNumber}` : header.letterNumber) || '000').toString().replace(/\s/g, '_').replace(/\//g, '-')}`,
    });

    // Build letter number like quotation generator
    const composedLetterNumber = (() => {
        const typeChar = header.docType === 'Tender' ? 'T' : header.docType === 'HR' ? 'H' : 'Q';
        const sectorCode = header.ubSection === 'Ar' ? 'Arch' : header.ubSection;
        return `UBQN ${sectorCode || ''} (${typeChar})- ${header.letterNumber || ''}`;
    })();

    const isSectorDisabled = (() => {
        if (header.firm === 'URBANBUILD™') return false;
        if (header.firm === 'URBANBUILD™ Pvt. Ltd.' && header.subsidiary === 'Consultancy') return false;
        return true;
    })();

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] bg-slate-50 p-4 font-sans">
            {/* ===== LEFT PANEL: FORM ===== */}
            <div className="w-full lg:w-1/3 bg-white p-5 rounded-lg shadow-sm border border-slate-200 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600">
                        <ArrowLeft size={14} /> Back
                    </button>
                    <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <span className="bg-emerald-600 text-white p-1 rounded">
                            <Plus size={14} />
                        </span>
                        New Forwarding Letter
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    {/* UBQN Lookup */}
                    <div>
                        <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">UBQN (Auto-Fill)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={ubqn}
                                onChange={e => setUbqn(e.target.value)}
                                onBlur={() => lookupUBQN(ubqn)}
                                onKeyDown={e => { if (e.key === 'Enter') lookupUBQN(ubqn); }}
                                className="w-full border p-2 pr-8 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                                placeholder="Enter UBQN to auto-fill details..."
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                {ubqnStatus === 'loading' && <Search size={14} className="text-emerald-500 animate-pulse" />}
                                {ubqnStatus === 'found' && <CheckCircle2 size={14} className="text-green-500" />}
                                {ubqnStatus === 'not_found' && <XCircle size={14} className="text-red-400" />}
                            </div>
                        </div>
                        {ubqnStatus === 'found' && <p className="text-[9px] text-green-600 mt-0.5">✓ Quotation found — fields auto-filled</p>}
                        {ubqnStatus === 'not_found' && <p className="text-[9px] text-red-400 mt-0.5">No matching quotation found</p>}
                    </div>

                    {/* Firm / Subsidiary / Sector */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Firm</label>
                            <select
                                value={header.firm}
                                onChange={e => setHeader({ ...header, firm: e.target.value })}
                                className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                            >
                                <option value="URBANBUILD™">URBANBUILD™</option>
                                <option value="URBANBUILD™ Pvt. Ltd.">URBANBUILD™ Pvt. Ltd.</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Subsidiary</label>
                            <select
                                value={header.subsidiary}
                                onChange={e => setHeader({ ...header, subsidiary: e.target.value })}
                                disabled={header.firm === 'URBANBUILD™'}
                                className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <option value="">Select Subsidiary</option>
                                <option value="Consultancy">Consultancy</option>
                                <option value="Quest">Quest</option>
                                <option value="Laboratory">Laboratory</option>
                                <option value="Realty">Realty</option>
                                <option value="Infra">Infra</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">UB Sector</label>
                            <select
                                value={header.ubSection}
                                onChange={e => {
                                    setHeader({ ...header, ubSection: e.target.value, subCategory: '' });
                                }}
                                disabled={isSectorDisabled}
                                className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <option value="">Select Sector</option>
                                <option value="RnB">Roads & Bridges</option>
                                <option value="BTP">Buildings & Town Planning</option>
                                <option value="EnS">Environment & Sustainability</option>
                                <option value="Arch">Architecture</option>
                            </select>
                        </div>
                    </div>

                    {/* RnB sub-type */}
                    {header.ubSection === 'RnB' && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                            <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">
                                RnB Sub-Type <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setHeader({ ...header, subCategory: 'Road' })}
                                    className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${header.subCategory === 'Road' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>ROAD</button>
                                <button type="button" onClick={() => setHeader({ ...header, subCategory: 'Bridge' })}
                                    className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${header.subCategory === 'Bridge' ? 'bg-cyan-600 text-white border-cyan-600 shadow-md' : 'bg-white text-cyan-600 border-cyan-200 hover:bg-cyan-100'}`}>BRIDGE</button>
                            </div>
                        </div>
                    )}

                    {/* Letter Number + Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Doc Type</label>
                            <select
                                value={header.docType}
                                onChange={e => setHeader({ ...header, docType: e.target.value })}
                                className="w-full border p-2 rounded text-xs font-bold text-emerald-600 focus:ring-1 focus:ring-emerald-500 outline-none"
                            >
                                <option value="Quotation">Quotation (Q)</option>
                                <option value="Tender">Tender (T)</option>
                                <option value="HR">HR (H)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Letter Number</label>
                            <input type="text" value={header.letterNumber} onChange={e => setHeader({ ...header, letterNumber: e.target.value })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="BR/PD PWD LDN/GAR/263" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Date</label>
                            <input type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                    </div>

                    {/* Recipient Details */}
                    <div className="border-t pt-3 space-y-3">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Recipient Details</p>
                        <input type="text" placeholder="Recipient Title (e.g. Executive engineer)" value={header.recipientTitle} onChange={e => setHeader({ ...header, recipientTitle: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                        <input type="text" placeholder="Division (e.g. Provincial Division)" value={header.recipientDivision} onChange={e => setHeader({ ...header, recipientDivision: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                        <input type="text" placeholder="Department (e.g. P.W.D Lansdowne)" value={header.recipientDepartment} onChange={e => setHeader({ ...header, recipientDepartment: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                        <input type="text" placeholder="Address / Location" value={header.recipientAddress} onChange={e => setHeader({ ...header, recipientAddress: e.target.value })} className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50" />
                    </div>

                    {/* Subject */}
                    <div className="border-t pt-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Subject</label>
                        <input type="text" value={header.subject} onChange={e => setHeader({ ...header, subject: e.target.value })} className="w-full border p-2 rounded text-xs outline-none" placeholder="Submission of Detailed Project Report (DPR)..." />
                    </div>

                    {/* Body Text */}
                    <div className="border-t pt-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Body Text</label>
                        <textarea value={header.bodyText} onChange={e => setHeader({ ...header, bodyText: e.target.value })} className="w-full border p-2 rounded text-xs outline-none min-h-[80px]" rows={4} />
                    </div>

                    {/* Attachments */}
                    <div className="border-t pt-3">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Attachments</p>
                            <button onClick={() => setAttachments([...attachments, { id: Date.now(), text: '' }])} className="text-[10px] font-bold flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors">
                                <Plus size={12} /> Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {attachments.map((att, index) => (
                                <div key={att.id} className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 w-5">{index + 1}.</span>
                                    <input type="text" value={att.text} onChange={e => {
                                        const newAtts = [...attachments];
                                        newAtts[index] = { ...newAtts[index], text: e.target.value };
                                        setAttachments(newAtts);
                                    }} className="flex-1 border p-2 rounded text-xs outline-none bg-slate-50/50" placeholder="e.g. DPR (1 Set)" />
                                    <button onClick={() => setAttachments(attachments.filter((_, i) => i !== index))} className="text-slate-400 hover:text-red-500">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <button onClick={() => handlePrint()} className="w-full mt-4 bg-emerald-700 text-white py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-emerald-800 font-bold text-sm shadow-md transition-all">
                    <Printer size={16} />
                    Print Forwarding Letter
                </button>
            </div>

            {/* ===== RIGHT PANEL: A4 PREVIEW ===== */}
            <div className="flex-1 bg-gray-200 rounded-lg border border-gray-300 flex justify-center overflow-auto p-8">
                <div ref={componentRef} className="bg-white shadow-2xl flex flex-col relative print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>

                    {/* HEADER: Same as QuotationGenerator */}
                    <div className="flex justify-between items-start mb-3">
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

                    {/* Associate Partner bar */}
                    <div className="bg-blue-50 border border-blue-100 py-1 px-2 text-center text-[9px] mb-2 uppercase font-bold tracking-wider">
                        <span className="text-slate-700">Associate Partner:</span> <span className="text-red-600 ml-1">Civil Tech Laboratory</span> <span className="text-slate-500">(NABL accredited, ISO 9001:2015 & 14001:2015 certified)</span>
                    </div>

                    {/* Address line */}
                    <div className="text-[9px] text-center text-slate-600 border-b border-[#1a3f85] pb-2 mb-4 leading-tight">
                        <p>
                            {header.firm === 'URBANBUILD™ Pvt. Ltd.'
                                ? "RO: 500, Satya Vihar lane, Chakrata Road, Dehradun, 248001"
                                : "RO: Bhaniyawala Tiraha, Jollygrant Dehradun, 248140"}
                        </p>
                    </div>

                    {/* LETTER CONTENT */}
                    <div className="flex-1 flex flex-col">
                        {/* L.N. + Date row */}
                        <div className="flex justify-between font-bold text-xs mb-6 text-slate-800">
                            <p>L.N.:- {(() => {
                                if (header.letterNumber?.startsWith('UBQN')) return header.letterNumber;
                                const typeChar = header.docType === 'Tender' ? 'T' : header.docType === 'HR' ? 'H' : 'Q';
                                const sectorCode = header.ubSection === 'Ar' ? 'Arch' : header.ubSection;
                                return `UBQN ${sectorCode || ''} (${typeChar})- ${header.letterNumber}`;
                            })()}</p>
                            <p>Date:- {header.date ? header.date.split('-').reverse().join('/') : '__/__/____'}</p>
                        </div>

                        {/* To block */}
                        <div className="mb-5 text-sm font-semibold text-slate-900 leading-relaxed">
                            To<br />
                            <div className="ml-6 mt-1">
                                {header.recipientTitle && <>{header.recipientTitle}<br /></>}
                                {header.recipientDivision && <>{header.recipientDivision}<br /></>}
                                {header.recipientDepartment && <>{header.recipientDepartment}<br /></>}
                                {header.recipientAddress && <>{header.recipientAddress}</>}
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="mb-4 text-sm text-slate-900 leading-snug">
                            <span className="font-bold">Sub:- </span>
                            <span className="font-bold">{header.subject || '________________________________________'}</span>
                        </div>

                        {/* Salutation */}
                        <p className="text-sm text-slate-900 mb-2">Respected Sir,</p>

                        {/* Body */}
                        <p className="text-sm text-slate-800 leading-relaxed mb-6 whitespace-pre-wrap" style={{ textAlign: 'justify' }}>
                            {header.bodyText || 'With due regards...'}
                        </p>

                        {/* Attachments */}
                        {attachments.filter(a => a.text).length > 0 && (
                            <div className="mb-6 text-sm text-slate-800">
                                <p className="font-bold mb-1">Attachments:</p>
                                <div className="ml-4">
                                    {attachments.filter(a => a.text).map((att, idx) => (
                                        <p key={att.id}>{idx + 1}. {att.text}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Signature block */}
                        <div className="mt-auto flex flex-col items-end pr-4 mb-4">
                            <p className="text-xs mb-8 font-medium text-slate-800">Yours sincerely</p>
                            <p className="font-bold text-xs uppercase text-[#1a3f85]">For {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? 'Urbanbuild Pvt. Ltd.' : 'Urbanbuild'}</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#1a3f85] pt-2 text-[8px] text-center text-slate-500 leading-snug">
                        Feasibility study, Geometric design, Pavement/crust design, Fwd/overlay design, Traffic survey, Geotechnical investigation, Building drawing and design, Bridge/culvert design, material testing, NDT and preparation of alignment and DPR etc.
                    </div>
                </div>
            </div>
        </div>
    );
}
