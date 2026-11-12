import { useState, useRef, useCallback, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
    Printer,
    Plus,
    Trash2,
    ArrowLeft,
    Search,
    CheckCircle2,
    XCircle,
    Save,
    Loader2,
    Edit3,
    Calendar,
    Sparkles,
    ZoomIn,
    ZoomOut,
    RotateCcw
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getReadableError } from '@/lib/errorHandler';
import { useToast } from '@/hooks/use-toast';
import { getShorthand, formatDisplayUbqn, buildCanonicalUbqn } from '@/lib/utils';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

interface AttachmentItem {
    id: number;
    text: string;
}

const TEMPLATE_PRESETS = [
    {
        label: 'Quotation',
        subject: 'Submission of Quotation / Financial Proposal',
        bodyText: 'With due regards, we are submitting herewith our quotation / financial proposal for the above-mentioned work for your kind perusal and favorable consideration.',
        attachment: 'Quotation Document (1 Set)'
    },
    {
        label: 'DPR / Report',
        subject: 'Submission of Detailed Project Report (DPR)',
        bodyText: 'With due regards, please find enclosed herewith the Detailed Project Report (DPR) along with necessary drawings and survey data for the above-referenced work for your kind review and further necessary action.',
        attachment: 'DPR (1 Set)'
    },
    {
        label: 'Invoice / Bill',
        subject: 'Submission of Tax Invoice for Consultancy Services',
        bodyText: 'With due regards, please find enclosed our Tax Invoice towards consultancy services delivered for the above-mentioned work. We request you to kindly process the payment at your earliest convenience.',
        attachment: 'Tax Invoice (Original + Duplicate)'
    },
    {
        label: 'Test Report',
        subject: 'Submission of Material Testing / NDT Report',
        bodyText: 'With due regards, we are pleased to submit the laboratory test / inspection report for the samples collected from the site as per the required standard specifications.',
        attachment: 'Test Report (1 Set)'
    }
];

const RECIPIENT_TITLE_OPTIONS = [
    'Executive Engineer',
    'Superintending Engineer',
    'Chief Engineer',
    'Assistant Engineer',
    'Project Director',
    'Project Manager',
    'General Manager',
    'Director',
    'Municipal Commissioner',
    'District Magistrate',
];

const RECIPIENT_DIVISION_OPTIONS = [
    'Provincial Division',
    'Construction Division',
    'Temporary Division',
    'National Highway Division',
    'PMGSY Division',
    'Irrigation Division',
    'Minor Irrigation Division',
    'World Bank Division',
    'ADB Division',
    'Project Implementation Unit (PIU)',
    'Rural Works Department Division',
    'Maintenance Division',
    'Electrical & Mechanical Division',
];

const RECIPIENT_DEPARTMENT_OPTIONS = [
    'Public Works Department',
    'PMGSY',
    'Irrigation Department',
    'Minor Irrigation Department',
    'Rural Works Department',
    'Uttarakhand Jal Sansthan',
    'Uttarakhand Peyjal Nigam',
    'BRIDCUL',
    'National Highways Authority of India',
    'Ministry of Road Transport & Highways',
    'Urban Development Department',
    'Mussoorie Dehradun Development Authority',
    'Haridwar Roorkee Development Authority',
    'Smart City Limited',
    'Uttarakhand Project Development and Construction Corporation',
    'Central Public Works Department',
    'Border Roads Organisation',
    'Forest Department',
    'Tourism Department',
    'Education Department',
    'Medical Health and Family Welfare Department',
];

export default function ForwardingLetterGenerator() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const componentRef = useRef<HTMLDivElement>(null);
    const logoPath = '/Quotation-logo.png';

    const [ubqn, setUbqn] = useState('');
    const [ubqnStatus, setUbqnStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
    const [recentQuotes, setRecentQuotes] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingLetter, setIsLoadingLetter] = useState(false);
    const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [isDirty, setIsDirty] = useState(false);

    useUnsavedChanges(isDirty);

    const [header, setHeader] = useState({
        firm: 'URBANBUILD™',
        subsidiary: '',
        ubSection: '',
        subCategory: '',
        letterNumber: '',
        date: '',
        recipientTitle: 'Executive Engineer',
        recipientDivision: '',
        recipientDepartment: '',
        recipientAddress: '',
        subject: '',
        bodyText: 'With due regards we are sending you hardcopy of ',
        docType: 'Quotation',
    });

    const [attachments, setAttachments] = useState<AttachmentItem[]>([
        { id: 1, text: '' },
    ]);

    // Fetch recent works with valid ubqn
    useEffect(() => {
        const fetchRecent = async () => {
            const { data } = await (supabase as any)
                .from('works')
                .select('ubqn, client_name, work_name')
                .not('ubqn', 'is', null)
                .order('created_at', { ascending: false })
                .limit(5);
            if (data) {
                const formattedData = data.map((d: any) => ({ ...d, subject: d.work_name }));
                setRecentQuotes(formattedData);
            }
        };
        fetchRecent();
    }, []);

    // Load existing letter if in edit mode
    useEffect(() => {
        if (id) {
            const fetchLetter = async () => {
                setIsLoadingLetter(true);
                try {
                    const { data, error } = await (supabase as any).from('forwarding_letters').select('*').eq('id', id).single();
                    if (error) throw error;
                    if (data) {
                        setUbqn(data.ubqn || '');
                        setSelectedWorkId(data.work_id || null);
                        setHeader({
                            firm: data.firm || 'URBANBUILD™',
                            subsidiary: data.subsidiary || '',
                            ubSection: data.ub_section || '',
                            subCategory: data.sub_category || '',
                            docType: data.doc_type || 'Quotation',
                            letterNumber: data.letter_number || '',
                            date: data.date || '',
                            recipientTitle: data.recipient_title || 'Executive Engineer',
                            recipientDivision: data.recipient_division || '',
                            recipientDepartment: data.recipient_department || '',
                            recipientAddress: data.recipient_address || '',
                            subject: data.subject || '',
                            bodyText: data.body_text || 'With due regards we are sending you hardcopy of '
                        });
                        if (data.attachments && Array.isArray(data.attachments)) {
                            setAttachments(data.attachments.map((text: string, index: number) => ({ id: Date.now() + index, text })));
                        }
                    }
                } catch (err: any) {
                    console.error('Error fetching forwarding letter:', err);
                    toast({
                        title: "Error Loading Letter",
                        description: getReadableError(err) || "Failed to load forwarding letter details",
                        variant: "destructive"
                    });
                } finally {
                    setIsLoadingLetter(false);
                }
            };
            fetchLetter();
        }
    }, [id, toast]);

    // Canonical composed letter number using shared buildCanonicalUbqn
    const composedLetterNumber = (() => {
        const rawLetter = (header.letterNumber || '').trim();
        const typeChar = header.docType === 'Tender' ? 'T' : header.docType === 'HR' ? 'H' : 'Q';
        const sectorCode = header.ubSection === 'Ar' ? 'Arch' : header.ubSection;

        if (!rawLetter) {
            return sectorCode ? `${sectorCode} (${typeChar})- ____` : `__ (${typeChar})- ____`;
        }

        return buildCanonicalUbqn(rawLetter, header.ubSection, header.docType);
    })();

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `ForwardingLetter-${(composedLetterNumber || 'Draft').replace(/\s+/g, '_').replace(/[\/\\]/g, '-')}`,
        pageStyle: `
            @page {
                size: A4;
                margin: 0;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        `,
        onPrintError: (errorLocation, error) => {
            console.error('Print Error:', errorLocation, error);
            toast({
                title: "Print Notice",
                description: "Print dialog could not be opened automatically.",
                variant: "destructive"
            });
        }
    });

    const isSectorDisabled = (() => {
        if (header.firm === 'URBANBUILD™') return false;
        if (header.firm === 'URBANBUILD™ Pvt. Ltd.' && header.subsidiary === 'Consultancy') return false;
        return true;
    })();

    useEffect(() => {
        if (isSectorDisabled) {
            setHeader(prev => ({ ...prev, ubSection: '', subCategory: '' }));
        }
    }, [isSectorDisabled]);

    const lookupUBQN = useCallback(async (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) { setUbqnStatus('idle'); return; }
        setUbqnStatus('loading');
        try {
            const db = supabase as any;

            // Try exact match first, then suffix match for works
            let { data: work } = await db.from('works').select('*, division:divisions(name, code)').eq('ubqn', trimmed).maybeSingle();
            if (!work) {
                const { data: matches } = await db.from('works').select('*, division:divisions(name, code)').ilike('ubqn', `%- ${trimmed}`).limit(1);
                if (matches && matches.length > 0) work = matches[0];
            }

            // If work not found directly, try matching quotations table
            if (!work) {
                let { data: quote } = await db.from('quotations').select('*, division:divisions(name, code)').eq('ubqn', trimmed).maybeSingle();
                if (!quote) {
                    const { data: qMatches } = await db.from('quotations').select('*, division:divisions(name, code)').ilike('ubqn', `%- ${trimmed}`).limit(1);
                    if (qMatches && qMatches.length > 0) quote = qMatches[0];
                }
                if (quote && quote.work_id) {
                    const { data: linkedWork } = await db.from('works').select('*, division:divisions(name, code)').eq('id', quote.work_id).maybeSingle();
                    if (linkedWork) work = linkedWork;
                }
            }

            if (!work) {
                // Check if any quotation matches and use quotation details
                let { data: quote } = await db.from('quotations').select('*').eq('ubqn', trimmed).maybeSingle();
                if (!quote) {
                    const { data: qMatches } = await db.from('quotations').select('*').ilike('ubqn', `%- ${trimmed}`).limit(1);
                    if (qMatches && qMatches.length > 0) quote = qMatches[0];
                }
                if (quote) {
                    const cleanNum = formatDisplayUbqn(quote.ubqn) || quote.ubqn || '';
                    const rawSec = quote.section || '';
                    const normalizedSec = rawSec === 'Arch' ? 'Ar' : rawSec === 'Ens' ? 'EnS' : rawSec;
                    setHeader(prev => ({
                        ...prev,
                        firm: quote.firm || prev.firm,
                        subsidiary: quote.subsidiary || '',
                        ubSection: normalizedSec,
                        subCategory: quote.subcategory || '',
                        letterNumber: cleanNum,
                        recipientTitle: quote.client_name || 'Executive Engineer',
                        recipientDepartment: quote.department_name || '',
                        recipientDivision: quote.division_name || '',
                        recipientAddress: quote.address || '',
                        subject: quote.subject || '',
                        docType: quote.ubqn?.includes('(T)') ? 'Tender' : quote.ubqn?.includes('(H)') ? 'HR' : 'Quotation',
                    }));
                    if (quote.work_id) setSelectedWorkId(quote.work_id);
                    setUbqnStatus('found');
                    setIsDirty(true);
                    return;
                }

                setUbqnStatus('not_found');
                setSelectedWorkId(null);
                return;
            }

            // Get quotation for this work if exists
            let { data: quote } = await db.from('quotations').select('*').eq('work_id', work.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

            const source = quote || work;
            setSelectedWorkId(work.id);

            let autoDocType = 'Quotation';
            if (trimmed.includes('(T)')) autoDocType = 'Tender';
            else if (trimmed.includes('(H)')) autoDocType = 'HR';
            else if (quote && quote.ubqn?.includes('(T)')) autoDocType = 'Tender';
            else if (quote && quote.ubqn?.includes('(H)')) autoDocType = 'HR';
            else if (source.doc_type) autoDocType = source.doc_type;

            const rawAutoSection = quote?.section || work.division?.code || '';
            const autoSection = rawAutoSection === 'Arch' ? 'Ar' : rawAutoSection === 'Ens' ? 'EnS' : rawAutoSection;
            const cleanNum = formatDisplayUbqn(source.ubqn) || source.ubqn || '';

            setHeader(prev => ({
                ...prev,
                firm: source.firm || prev.firm,
                subsidiary: source.subsidiary || '',
                ubSection: autoSection,
                subCategory: source.subcategory || '',
                letterNumber: cleanNum,
                recipientTitle: quote?.client_name || 'Executive Engineer',
                recipientDepartment: quote?.department_name || '',
                recipientDivision: quote?.division_name || work.division?.name || '',
                recipientAddress: quote?.address || '',
                subject: source.work_name || quote?.subject || '',
                docType: autoDocType,
            }));

            setUbqnStatus('found');
            setIsDirty(true);
        } catch {
            setUbqnStatus('not_found');
        }
    }, []);

    const applyTemplatePreset = (preset: typeof TEMPLATE_PRESETS[0]) => {
        setHeader(prev => ({
            ...prev,
            subject: prev.subject && prev.subject !== '________________________________________' ? prev.subject : preset.subject,
            bodyText: preset.bodyText
        }));

        if (preset.attachment) {
            setAttachments(prev => {
                const hasExisting = prev.some(a => a.text.trim());
                if (!hasExisting) {
                    return [{ id: Date.now(), text: preset.attachment }];
                }
                const alreadyIncluded = prev.some(a => a.text.toLowerCase().includes(preset.label.toLowerCase()));
                if (!alreadyIncluded) {
                    return [...prev, { id: Date.now(), text: preset.attachment }];
                }
                return prev;
            });
        }
        setIsDirty(true);
    };

    const handleSetToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setHeader(prev => ({ ...prev, date: today }));
        setIsDirty(true);
    };

    const saveToDatabase = async (shouldNavigate: boolean = true): Promise<boolean> => {
        setIsSaving(true);
        try {
            let targetWorkId = selectedWorkId;

            // 1. If targetWorkId is not set, attempt auto-resolving work from ubqn or letter number
            const queryVal = (ubqn || header.letterNumber || '').trim();
            if (!targetWorkId && queryVal) {
                const db = supabase as any;
                let { data: work } = await db.from('works').select('id, ubqn').eq('ubqn', queryVal).maybeSingle();
                if (!work) {
                    const { data: matches } = await db.from('works').select('id, ubqn').ilike('ubqn', `%- ${queryVal}`).limit(1);
                    if (matches && matches.length > 0) work = matches[0];
                }
                if (!work) {
                    const { data: quote } = await db.from('quotations').select('work_id, ubqn').eq('ubqn', queryVal).maybeSingle();
                    if (quote && quote.work_id) {
                        work = { id: quote.work_id, ubqn: quote.ubqn };
                    }
                }
                if (work) {
                    targetWorkId = work.id;
                    setSelectedWorkId(work.id);
                }
            }

            // 2. Build payload
            const payload: any = {
                ubqn: ubqn.trim() || null,
                firm: header.firm,
                subsidiary: header.subsidiary,
                ub_section: header.ubSection,
                sub_category: header.subCategory,
                doc_type: header.docType,
                letter_number: header.letterNumber,
                date: header.date || null,
                recipient_title: header.recipientTitle,
                recipient_division: header.recipientDivision,
                recipient_department: header.recipientDepartment,
                recipient_address: header.recipientAddress,
                subject: header.subject,
                body_text: header.bodyText,
                attachments: attachments.filter(a => a.text.trim()).map(a => a.text.trim())
            };

            if (targetWorkId) {
                payload.work_id = targetWorkId;
            }

            if (id) {
                let { error } = await (supabase as any).from('forwarding_letters').update(payload).eq('id', id);
                if (error && error.message?.toLowerCase().includes('work_id')) {
                    delete payload.work_id;
                    const res = await (supabase as any).from('forwarding_letters').update(payload).eq('id', id);
                    error = res.error;
                }
                if (error) throw error;
                toast({ title: "Success", description: "Forwarding Letter updated successfully!", variant: "default" });
                setIsDirty(false);
                if (shouldNavigate) {
                    navigate('/forwarding-letters');
                }
            } else {
                let { data, error } = await (supabase as any).from('forwarding_letters').insert(payload).select('id').maybeSingle();
                if (error && error.message?.toLowerCase().includes('work_id')) {
                    delete payload.work_id;
                    const res = await (supabase as any).from('forwarding_letters').insert(payload).select('id').maybeSingle();
                    data = res.data;
                    error = res.error;
                }
                if (error) throw error;
                toast({ title: "Success", description: "Forwarding Letter saved successfully!", variant: "default" });
                setIsDirty(false);
                if (shouldNavigate) {
                    navigate('/forwarding-letters');
                } else if (data?.id) {
                    navigate(`/forwarding-letter/edit/${data.id}`, { replace: true });
                }
            }

            // 3. Sync reference to works table if work_id exists (save canonical reference)
            const canonicalRef = composedLetterNumber || header.letterNumber;
            if (targetWorkId && canonicalRef) {
                await (supabase as any).from('works').update({
                    forwarding_letter: canonicalRef,
                    updated_at: new Date().toISOString()
                }).eq('id', targetWorkId);
            }

            setIsDirty(false);
            return true;
        } catch (error: any) {
            console.error('Error saving letter:', error);
            toast({ title: "Error", description: getReadableError(error) || "Failed to save forwarding letter", variant: "destructive" });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndPrint = async () => {
        const saved = await saveToDatabase(false);
        if (saved) {
            setTimeout(() => {
                handlePrint();
            }, 150);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-56px)] md:h-screen bg-slate-50 p-4 font-sans">
            {/* ===== LEFT PANEL: FORM ===== */}
            <div className="w-full lg:w-1/3 bg-white p-5 rounded-lg shadow-sm border border-slate-200 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back
                    </button>
                    <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <span className="bg-emerald-600 text-white p-1 rounded">
                            {id ? <Edit3 size={14} /> : <Plus size={14} />}
                        </span>
                        {id ? 'Edit Forwarding Letter' : 'New Forwarding Letter'}
                    </div>
                </div>

                {isLoadingLetter ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Loader2 size={24} className="animate-spin text-emerald-600" />
                        <span className="text-xs font-medium">Loading letter details...</span>
                    </div>
                ) : (
                    <div className="space-y-3 mb-6">
                        {/* UBQN Lookup */}
                        <div>
                            <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">UBQN (Auto-Fill)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={ubqn}
                                    onChange={e => {
                                        setUbqn(e.target.value);
                                        setIsDirty(true);
                                    }}
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

                            {/* Recent Suggestions */}
                            {recentQuotes.length > 0 && ubqnStatus !== 'found' && (
                                <div className="mt-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                                    <p className="text-[9px] font-bold text-blue-600 uppercase mb-1.5 px-1">Recent Quotations</p>
                                    <div className="space-y-1">
                                        {recentQuotes.map((q, i) => {
                                            const displayNum = q.ubqn ? formatDisplayUbqn(q.ubqn) : 'N/A';
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => {
                                                        setUbqn(displayNum);
                                                        lookupUBQN(q.ubqn);
                                                        setIsDirty(true);
                                                    }}
                                                    className="w-full text-left p-1.5 hover:bg-white rounded transition-colors group flex items-start gap-2"
                                                >
                                                    <span className="text-[10px] font-black text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-100 shrink-0 font-mono">
                                                        {displayNum}
                                                    </span>
                                                    <span className="text-[10px] text-slate-600 truncate group-hover:text-blue-600">
                                                        {getShorthand(q.client_name || q.subject || '') || 'N/A'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Firm / Subsidiary / Sector */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Firm</label>
                                <select
                                    value={header.firm}
                                    onChange={e => {
                                        setHeader({ ...header, firm: e.target.value });
                                        setIsDirty(true);
                                    }}
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
                                    onChange={e => {
                                        setHeader({ ...header, subsidiary: e.target.value });
                                        setIsDirty(true);
                                    }}
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
                                        setIsDirty(true);
                                    }}
                                    disabled={isSectorDisabled}
                                    className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    <option value="">Select Sector</option>
                                    <option value="RnB">Roads & Bridges</option>
                                    <option value="BTP">Buildings & Town Planning</option>
                                    <option value="EnS">Environment & Sustainability</option>
                                    <option value="WRE">Water Resource Engineering</option>
                                    <option value="Ar">Architecture</option>
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
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHeader({ ...header, subCategory: 'Road' });
                                            setIsDirty(true);
                                        }}
                                        className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${header.subCategory === 'Road' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}
                                    >
                                        ROAD
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHeader({ ...header, subCategory: 'Bridge' });
                                            setIsDirty(true);
                                        }}
                                        className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${header.subCategory === 'Bridge' ? 'bg-cyan-600 text-white border-cyan-600 shadow-md' : 'bg-white text-cyan-600 border-cyan-200 hover:bg-cyan-100'}`}
                                    >
                                        BRIDGE
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Letter Number + Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Doc Type</label>
                                <select
                                    value={header.docType}
                                    onChange={e => {
                                        setHeader({ ...header, docType: e.target.value });
                                        setIsDirty(true);
                                    }}
                                    className="w-full border p-2 rounded text-xs font-bold text-emerald-600 focus:ring-1 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="Quotation">Quotation (Q)</option>
                                    <option value="Tender">Tender (T)</option>
                                    <option value="HR">HR (H)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Letter Number</label>
                                <input
                                    type="text"
                                    value={header.letterNumber}
                                    onChange={e => {
                                        setHeader({ ...header, letterNumber: e.target.value });
                                        setIsDirty(true);
                                    }}
                                    className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                                    placeholder="BR/PD PWD LDN/GAR/263"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-0.5">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Date</label>
                                    <button
                                        type="button"
                                        onClick={handleSetToday}
                                        className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                                        title="Set today's date"
                                    >
                                        <Calendar size={10} /> Today
                                    </button>
                                </div>
                                <input
                                    type="date"
                                    value={header.date}
                                    onChange={e => {
                                        setHeader({ ...header, date: e.target.value });
                                        setIsDirty(true);
                                    }}
                                    className="w-full border p-2 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Recipient Details */}
                        <div className="border-t pt-3 space-y-3">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Recipient Details</p>

                            {/* Recipient Title */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Recipient Title</label>
                                <div className="flex gap-2">
                                    <select
                                        value={RECIPIENT_TITLE_OPTIONS.includes(header.recipientTitle) ? header.recipientTitle : (header.recipientTitle ? '__OTHER__' : '')}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '__OTHER__') {
                                                if (RECIPIENT_TITLE_OPTIONS.includes(header.recipientTitle)) {
                                                    setHeader({ ...header, recipientTitle: '' });
                                                    setIsDirty(true);
                                                }
                                            } else {
                                                setHeader({ ...header, recipientTitle: val });
                                                setIsDirty(true);
                                            }
                                        }}
                                        className="flex-1 border p-2 rounded text-xs font-medium outline-none bg-slate-50/50 cursor-pointer"
                                    >
                                        <option value="">-- Select Title --</option>
                                        {RECIPIENT_TITLE_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt} ({getShorthand(opt)})</option>
                                        ))}
                                        <option value="__OTHER__">Other / Custom Title</option>
                                    </select>
                                    {getShorthand(header.recipientTitle) && (
                                        <span className="shrink-0 self-center bg-amber-100 text-amber-700 border border-amber-200 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                            {getShorthand(header.recipientTitle)}
                                        </span>
                                    )}
                                </div>
                                {(!RECIPIENT_TITLE_OPTIONS.includes(header.recipientTitle) || header.recipientTitle === '') && (
                                    <input
                                        type="text"
                                        placeholder="Enter Custom Recipient Title (e.g. Chief Executive Officer)"
                                        value={header.recipientTitle}
                                        onChange={e => {
                                            setHeader({ ...header, recipientTitle: e.target.value });
                                            setIsDirty(true);
                                        }}
                                        className="w-full mt-2 border p-2 rounded text-xs outline-none bg-white"
                                    />
                                )}
                            </div>

                            {/* Division Name */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Division Name</label>
                                <div className="flex gap-2">
                                    <select
                                        value={RECIPIENT_DIVISION_OPTIONS.includes(header.recipientDivision) ? header.recipientDivision : (header.recipientDivision ? '__OTHER__' : '')}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '__OTHER__') {
                                                if (RECIPIENT_DIVISION_OPTIONS.includes(header.recipientDivision)) {
                                                    setHeader({ ...header, recipientDivision: '' });
                                                    setIsDirty(true);
                                                }
                                            } else {
                                                setHeader({ ...header, recipientDivision: val });
                                                setIsDirty(true);
                                            }
                                        }}
                                        className="flex-1 border p-2 rounded text-xs font-medium outline-none bg-slate-50/50 cursor-pointer"
                                    >
                                        <option value="">-- Select Division --</option>
                                        {RECIPIENT_DIVISION_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt} ({getShorthand(opt)})</option>
                                        ))}
                                        <option value="__OTHER__">Other / Custom Division</option>
                                    </select>
                                    {getShorthand(header.recipientDivision) && (
                                        <span className="shrink-0 self-center bg-blue-100 text-blue-700 border border-blue-200 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                            {getShorthand(header.recipientDivision)}
                                        </span>
                                    )}
                                </div>
                                {(!RECIPIENT_DIVISION_OPTIONS.includes(header.recipientDivision) || header.recipientDivision === '') && (
                                    <input
                                        type="text"
                                        placeholder="Enter Custom Division Name (e.g. Special Project Division)"
                                        value={header.recipientDivision}
                                        onChange={e => {
                                            setHeader({ ...header, recipientDivision: e.target.value });
                                            setIsDirty(true);
                                        }}
                                        className="w-full mt-2 border p-2 rounded text-xs outline-none bg-white"
                                    />
                                )}
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
                                <div className="flex gap-2">
                                    <select
                                        value={RECIPIENT_DEPARTMENT_OPTIONS.includes(header.recipientDepartment) ? header.recipientDepartment : (header.recipientDepartment ? '__OTHER__' : '')}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '__OTHER__') {
                                                if (RECIPIENT_DEPARTMENT_OPTIONS.includes(header.recipientDepartment)) {
                                                    setHeader({ ...header, recipientDepartment: '' });
                                                    setIsDirty(true);
                                                }
                                            } else {
                                                setHeader({ ...header, recipientDepartment: val });
                                                setIsDirty(true);
                                            }
                                        }}
                                        className="flex-1 border p-2 rounded text-xs font-medium outline-none bg-slate-50/50 cursor-pointer"
                                    >
                                        <option value="">-- Select Department --</option>
                                        {RECIPIENT_DEPARTMENT_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt} ({getShorthand(opt)})</option>
                                        ))}
                                        <option value="__OTHER__">Other / Custom Department</option>
                                    </select>
                                    {getShorthand(header.recipientDepartment) && (
                                        <span className="shrink-0 self-center bg-emerald-100 text-emerald-700 border border-emerald-200 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                            {getShorthand(header.recipientDepartment)}
                                        </span>
                                    )}
                                </div>
                                {(!RECIPIENT_DEPARTMENT_OPTIONS.includes(header.recipientDepartment) || header.recipientDepartment === '') && (
                                    <input
                                        type="text"
                                        placeholder="Enter Custom Department (e.g. Irrigation & Flood Control)"
                                        value={header.recipientDepartment}
                                        onChange={e => {
                                            setHeader({ ...header, recipientDepartment: e.target.value });
                                            setIsDirty(true);
                                        }}
                                        className="w-full mt-2 border p-2 rounded text-xs outline-none bg-white"
                                    />
                                )}
                            </div>

                            {/* Manual Address */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address / Location (Manual)</label>
                                <input
                                    type="text"
                                    placeholder="Enter Address / Location manually (e.g. Lansdowne)"
                                    value={header.recipientAddress}
                                    onChange={e => {
                                        setHeader({ ...header, recipientAddress: e.target.value });
                                        setIsDirty(true);
                                    }}
                                    className="w-full border p-2 rounded text-xs outline-none bg-slate-50/50"
                                />
                            </div>

                            {(header.recipientTitle || header.recipientDivision || header.recipientDepartment || header.recipientAddress) && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Client →</span>
                                    <span className="text-[10px] font-bold text-slate-700 truncate">
                                        {[getShorthand(header.recipientTitle), getShorthand(header.recipientDivision), getShorthand(header.recipientDepartment), header.recipientAddress].filter(Boolean).join(' ')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Quick Presets / Templates */}
                        <div className="border-t pt-3">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <Sparkles size={11} className="text-amber-500" /> Quick Templates
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {TEMPLATE_PRESETS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => applyTemplatePreset(preset)}
                                        className="text-left px-2 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-[10px] font-semibold text-slate-700 hover:text-emerald-800 transition-colors truncate"
                                    >
                                        ⚡ {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="border-t pt-3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Subject</label>
                            <input
                                type="text"
                                value={header.subject}
                                onChange={e => {
                                    setHeader({ ...header, subject: e.target.value });
                                    setIsDirty(true);
                                }}
                                className="w-full border p-2 rounded text-xs outline-none"
                                placeholder="Submission of Detailed Project Report (DPR)..."
                            />
                        </div>

                        {/* Body Text */}
                        <div className="border-t pt-3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Body Text</label>
                            <textarea
                                value={header.bodyText}
                                onChange={e => {
                                    setHeader({ ...header, bodyText: e.target.value });
                                    setIsDirty(true);
                                }}
                                className="w-full border p-2 rounded text-xs outline-none min-h-[80px]"
                                rows={4}
                            />
                        </div>

                        {/* Attachments */}
                        <div className="border-t pt-3">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Attachments</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAttachments([...attachments, { id: Date.now(), text: '' }]);
                                        setIsDirty(true);
                                    }}
                                    className="text-[10px] font-bold flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                                >
                                    <Plus size={12} /> Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {attachments.map((att, index) => (
                                    <div key={att.id} className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500 w-5">{index + 1}.</span>
                                        <input
                                            type="text"
                                            value={att.text}
                                            onChange={e => {
                                                const newAtts = [...attachments];
                                                newAtts[index] = { ...newAtts[index], text: e.target.value };
                                                setAttachments(newAtts);
                                                setIsDirty(true);
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    setAttachments(prev => [...prev, { id: Date.now(), text: '' }]);
                                                    setIsDirty(true);
                                                }
                                            }}
                                            className="flex-1 border p-2 rounded text-xs outline-none bg-slate-50/50"
                                            placeholder="e.g. DPR (1 Set) - press Enter to add next"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAttachments(attachments.filter((_, i) => i !== index));
                                                setIsDirty(true);
                                            }}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Remove attachment"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Generate Button */}
                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={() => saveToDatabase(true)}
                        disabled={isSaving || isLoadingLetter}
                        className="flex-1 bg-white border border-emerald-600 text-emerald-700 py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-emerald-50 font-bold text-sm shadow-sm transition-all disabled:opacity-70"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveAndPrint}
                        disabled={isSaving || isLoadingLetter}
                        className="flex-[2] bg-emerald-700 text-white py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-emerald-800 font-bold text-sm shadow-md transition-all disabled:opacity-70"
                    >
                        <Printer size={16} />
                        Save & Print
                    </button>
                </div>
            </div>

            {/* ===== RIGHT PANEL: A4 PREVIEW ===== */}
            <div className="flex-1 bg-gray-200 rounded-lg border border-gray-300 flex flex-col items-center overflow-auto p-4 md:p-8 relative">
                {/* Zoom Control Bar */}
                <div className="sticky top-0 z-10 mb-4 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-lg shadow-sm px-3 py-1.5 flex items-center gap-2 text-xs text-slate-700 w-full max-w-[210mm]">
                    <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Preview:</span>
                    <button
                        type="button"
                        onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))}
                        className="p-1 rounded hover:bg-slate-100 text-slate-600"
                        title="Zoom Out"
                    >
                        <ZoomOut size={14} />
                    </button>
                    <span className="font-mono text-xs font-bold w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button
                        type="button"
                        onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
                        className="p-1 rounded hover:bg-slate-100 text-slate-600"
                        title="Zoom In"
                    >
                        <ZoomIn size={14} />
                    </button>
                    <div className="h-3 w-[1px] bg-slate-300 mx-1" />
                    <button
                        type="button"
                        onClick={() => setZoomLevel(1)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded hover:bg-slate-100 text-slate-600 flex items-center gap-1"
                        title="Reset Zoom to 100%"
                    >
                        <RotateCcw size={11} /> 100%
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoomLevel(0.85)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded hover:bg-slate-100 text-slate-600"
                        title="Fit preview on typical laptop screens"
                    >
                        Fit Screen
                    </button>
                    <div className="h-3 w-[1px] bg-slate-300 mx-1" />
                    <button
                        type="button"
                        onClick={() => handlePrint()}
                        className="ml-auto px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded shadow-sm flex items-center gap-1.5 transition-colors"
                        title="Print forwarding letter directly"
                    >
                        <Printer size={13} /> Print
                    </button>
                </div>

                <div
                    style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.15s ease-out'
                    }}
                >
                    <div ref={componentRef} className="bg-white shadow-2xl flex flex-col relative print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>

                        {/* HEADER: Same as QuotationGenerator */}
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-6">
                                <img src={logoPath} alt="Logo" className="w-24 object-contain" />
                                <div className="flex flex-col justify-center">
                                    <h1 className="text-[28px] font-black text-[#1a3f85] tracking-tight leading-none mb-1.5">
                                        {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? (
                                            <>URBANBUILD<span className="text-[9px] font-bold align-top ml-0.5">TM</span> Pvt. Ltd.</>
                                        ) : (
                                            <>URBANBUILD<span className="text-[9px] font-bold align-top ml-0.5">TM</span></>
                                        )}
                                    </h1>
                                    <p className="text-[#1a3f85] font-bold text-xs tracking-[0.25em] uppercase">
                                        Design ◆ Consultancy ◆ Construction
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col justify-center gap-1.5">
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                    GSTIN: {header.firm === 'URBANBUILD™' ? <span className="text-[#1a3f85]">05BSSPT0457K1Z4</span> : <span className="text-[#1a3f85] bg-blue-50 px-1.5 py-0.5 border border-blue-100 rounded-sm">05AADCU8305Q1ZW</span>}
                                </p>
                                <p className="text-sm font-bold text-slate-800 tracking-wider">
                                    📞 {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? '9259002105' : '82917 22917'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center text-center text-[10px] text-slate-600 border-b-[3px] border-[#1a3f85] pb-4 mb-6 leading-relaxed font-medium">
                            <p className="uppercase tracking-wide">
                                <span className="text-[#1a3f85] font-black mr-1">RO:</span>
                                {header.firm === 'URBANBUILD™ Pvt. Ltd.'
                                    ? "500, Satya Vihar lane, Chakrata Road, Dehradun, 248001"
                                    : "Bhaniyawala Tiraha, Jollygrant Dehradun, 248140"}
                            </p>
                            <p className="mt-1 tracking-widest text-[9px] font-semibold text-slate-500 uppercase">
                                Email: <span className="text-[#1a3f85] font-bold lowercase">consultancy@urbanbuild.co.in</span> &nbsp;|&nbsp; Website: <span className="text-[#1a3f85] font-bold lowercase">urbanbuild.co.in</span>
                            </p>
                        </div>

                        {/* LETTER CONTENT */}
                        <div className="flex-1 flex flex-col">
                            {/* L.N. + Date row */}
                            <div className="flex justify-between font-bold text-xs mb-6 text-slate-800">
                                <p>L.N.:- {composedLetterNumber}</p>
                                <p>Date:- {header.date ? header.date.split('-').reverse().join('/') : '__/__/____'}</p>
                            </div>

                            {/* To block */}
                            <div className="mb-5 text-sm font-semibold text-slate-900 leading-relaxed">
                                To,<br />
                                {header.recipientTitle && <>{header.recipientTitle}<br /></>}
                                {header.recipientDivision && <>{header.recipientDivision}<br /></>}
                                {header.recipientDepartment && <>{header.recipientDepartment}<br /></>}
                                {header.recipientAddress && <>{header.recipientAddress}</>}
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
                            {attachments.filter(a => a.text.trim()).length > 0 && (
                                <div className="mb-6 text-sm text-slate-800">
                                    <p className="font-bold mb-1">Attachments:</p>
                                    <div className="ml-4">
                                        {attachments.filter(a => a.text.trim()).map((att, idx) => (
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
        </div>
    );
}

