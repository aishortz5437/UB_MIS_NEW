import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Printer,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Loader2,
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Edit3
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getReadableError } from '@/lib/errorHandler';
import { notifyDirectors } from '@/lib/notifications';
import { cn, buildCanonicalUbqn, parseEstablishedUbqn, formatDisplayUbqn, ensureWreDivision, getShorthand } from '@/lib/utils';
import { Division, Work } from '@/types/database';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

// --- SERVICE PARTICULAR PRESETS ---
const SERVICE_PRESETS = [
  {
    particular: 'Preparation of Detailed Project Report (DPR) including alignment design, drawings & cost estimation',
    unit: 'Job',
    rate: 0,
    qty: 1
  },
  {
    particular: 'Topographical Survey using Total Station / DGPS and establishing benchmark control points',
    unit: 'Km',
    rate: 0,
    qty: 1
  },
  {
    particular: 'Subsoil Exploration & Geotechnical Investigation including borehole drilling and standard penetration test (SPT)',
    unit: 'Mtr',
    rate: 0,
    qty: 1
  },
  {
    particular: 'Traffic Volume Survey (7-day 24-hour Classified Volume Count & Axle Load Spectrum study)',
    unit: 'Station',
    rate: 0,
    qty: 1
  },
  {
    particular: 'Hydrological and Hydraulic Study for bridge and cross-drainage structures as per IRC SP-13',
    unit: 'Site',
    rate: 0,
    qty: 1
  },
  {
    particular: 'Preparation of Architectural & Structural Drawings, GAD and 3D Visualizations',
    unit: 'Set',
    rate: 0,
    qty: 1
  }
];

// --- RECIPIENT PRESET OPTIONS ---
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

// --- HELPER: CONVERT NUMBER TO INDIAN WORDS ---
const numberToWordsIndian = (num: number): string => {
  const rounded = Math.round(Number(num) || 0);
  if (rounded === 0) return 'Zero';
  if (rounded < 0) return 'Negative ' + numberToWordsIndian(Math.abs(rounded));

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

  let n = rounded;
  let res = "";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;

  if (crore > 0) res += formatLessThanThousand(crore) + " Crore ";
  if (lakh > 0) res += formatLessThanThousand(lakh) + " Lakh ";
  if (thousand > 0) res += formatLessThanThousand(thousand) + " Thousand ";
  if (n > 0) res += formatLessThanThousand(n);

  return res.trim() + " Only";
};

// --- PERSISTENT METADATA HELPERS ---
const QUOTE_META_STORAGE_KEY = 'ub_quotation_meta_v1';

interface StoredQuotationMeta {
  quoteMode: 'DETAIL' | 'LUMPSUM' | 'PERCENTAGE';
  displayTotal?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quoteItems?: any[];
  notes?: string[];
  showTerms?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  termsData?: any;
}

const saveLocalQuoteMeta = (keys: (string | null | undefined)[], meta: StoredQuotationMeta) => {
  try {
    const raw = localStorage.getItem(QUOTE_META_STORAGE_KEY);
    const store: Record<string, StoredQuotationMeta> = raw ? JSON.parse(raw) : {};
    keys.forEach(k => {
      if (k && k.trim()) {
        store[k.trim()] = meta;
      }
    });
    localStorage.setItem(QUOTE_META_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Could not save quotation meta to localStorage:', e);
  }
};

const getLocalQuoteMeta = (keys: (string | null | undefined)[]): StoredQuotationMeta | null => {
  try {
    const raw = localStorage.getItem(QUOTE_META_STORAGE_KEY);
    if (!raw) return null;
    const store: Record<string, StoredQuotationMeta> = JSON.parse(raw);
    for (const k of keys) {
      if (k && k.trim() && store[k.trim()]) {
        return store[k.trim()];
      }
    }
  } catch (e) {
    console.warn('Could not read quotation meta from localStorage:', e);
  }
  return null;
};

const encodeUnitWithMeta = (
  unit: string,
  mode: 'DETAIL' | 'LUMPSUM' | 'PERCENTAGE',
  rawAmount?: string | number
): string => {
  const cleanUnit = (unit || '').replace(/^\[__M:(DETAIL|LUMPSUM|PERCENTAGE)(?::(.*?))?__\]/, '').trim();
  if (mode === 'DETAIL') return cleanUnit;
  if (mode === 'PERCENTAGE') {
    const encodedAmt = encodeURIComponent(String(rawAmount ?? ''));
    return `[__M:PERCENTAGE:${encodedAmt}__]${cleanUnit}`;
  }
  return `[__M:LUMPSUM__]${cleanUnit}`;
};

const decodeUnitWithMeta = (storedUnit: string | null | undefined): {
  cleanUnit: string;
  embeddedMode: 'DETAIL' | 'LUMPSUM' | 'PERCENTAGE' | null;
  embeddedAmount: string | null;
} => {
  const raw = String(storedUnit || '');
  const match = raw.match(/^\[__M:(DETAIL|LUMPSUM|PERCENTAGE)(?::(.*?))?__\](.*)$/);
  if (!match) {
    return { cleanUnit: raw, embeddedMode: null, embeddedAmount: null };
  }
  const embeddedMode = match[1] as 'DETAIL' | 'LUMPSUM' | 'PERCENTAGE';
  let embeddedAmount: string | null = null;
  if (match[2] !== undefined) {
    try {
      embeddedAmount = decodeURIComponent(match[2]);
    } catch {
      embeddedAmount = match[2];
    }
  }
  return {
    cleanUnit: match[3] || '',
    embeddedMode,
    embeddedAmount,
  };
};

// Extract the column name reported missing by PostgREST (PGRST204) or PostgreSQL (42703)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractMissingColumnName = (error: any): string | null => {
  const msg = [error?.message, error?.details, error?.hint, typeof error === 'string' ? error : '']
    .filter(Boolean)
    .join(' ');
  const pgrstMatch = msg.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];
  const pgMatch = msg.match(/column "([^"]+)" of relation/i);
  if (pgMatch?.[1]) return pgMatch[1];
  const pgSimpleMatch = msg.match(/column "([^"]+)" does not exist/i);
  if (pgSimpleMatch?.[1]) return pgSimpleMatch[1];
  const singleQuoteMatch = msg.match(/column '([^']+)' does not exist/i);
  if (singleQuoteMatch?.[1]) return singleQuoteMatch[1];
  const fieldMatch = msg.match(/has no field "([^"]+)"/i);
  if (fieldMatch?.[1]) return fieldMatch[1];
  return null;
};

// Map stripped payload keys to possible alternate/legacy column names on quotations and quotation_items
const QUOTATION_ALTERNATE_COLUMNS: Record<string, string> = {
  quotation_date: 'date',
  department_name: 'department',
  division_name: 'division',
  reference_no: 'reference',
  section: 'ub_section',
  subcategory: 'sub_category',
  consultancy_cost: 'total_amount',
};

const QUOTATION_ITEM_ALTERNATE_COLUMNS: Record<string, string> = {
  description: 'particular',
};

// Probe the live schema of a table by fetching 1 row and reading its column keys
const liveTableColumnsCache: Record<string, string[] | null> = {};
const getLiveTableColumns = async (tableName: string): Promise<string[] | null> => {
  if (tableName in liveTableColumnsCache && liveTableColumnsCache[tableName]) {
    return liveTableColumnsCache[tableName];
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(tableName as any) as any)
      .select('*')
      .limit(1);
    if (!error && Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === 'object') {
      const cols = Object.keys(data[0]);
      liveTableColumnsCache[tableName] = cols;
      return cols;
    }
  } catch {
    // ignore probe errors
  }
  return null;
};

// Align a payload object with the known live columns of a table (mapping known aliases automatically)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const alignPayloadToLiveColumns = (tableName: string, rawPayload: Record<string, any>, liveCols: string[] | null): Record<string, any> => {
  if (!liveCols || liveCols.length === 0) return { ...rawPayload };
  const liveSet = new Set(liveCols);
  const altMap = tableName === 'quotations'
    ? QUOTATION_ALTERNATE_COLUMNS
    : tableName === 'quotation_items'
      ? QUOTATION_ITEM_ALTERNATE_COLUMNS
      : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aligned: Record<string, any> = {};

  for (const [key, val] of Object.entries(rawPayload)) {
    if (liveSet.has(key)) {
      aligned[key] = val;
    } else if (altMap && altMap[key] && liveSet.has(altMap[key])) {
      aligned[altMap[key]] = val;
    }
  }
  return aligned;
};

// Extract the column name reported in a PostgreSQL NOT NULL constraint violation (23502)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractNotNullColumnName = (error: any): string | null => {
  const msg = [error?.message, error?.details, error?.hint, typeof error === 'string' ? error : '']
    .filter(Boolean)
    .join(' ');
  const match = msg.match(/null value in column "([^"]+)"/i) || msg.match(/null value in column '([^']+)'/i);
  return match?.[1] || null;
};

// Self-healing insert that automatically strips any columns not present in the live database schema
// and supplies sensible defaults if a legacy column has a NOT NULL constraint.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adaptiveInsertSingle = async (tableName: string, initialPayload: Record<string, any>) => {
  const liveCols = await getLiveTableColumns(tableName);
  const payload = alignPayloadToLiveColumns(tableName, initialPayload, liveCols);
  const triedAlternates = new Set<string>();
  for (let attempt = 0; attempt < 20; attempt++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(tableName as any) as any)
      .insert([payload])
      .select('id')
      .single();

    if (!error) return { data, error: null };

    const missingCol = extractMissingColumnName(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(payload, missingCol)) {
      const removedValue = payload[missingCol];
      console.warn(`[adaptiveInsertSingle] Stripping missing column '${missingCol}' from '${tableName}' payload and retrying.`);
      delete payload[missingCol];

      if (tableName === 'quotations' && QUOTATION_ALTERNATE_COLUMNS[missingCol]) {
        const altCol = QUOTATION_ALTERNATE_COLUMNS[missingCol];
        if (!triedAlternates.has(altCol) && !Object.prototype.hasOwnProperty.call(payload, altCol) && (!liveCols || liveCols.includes(altCol))) {
          triedAlternates.add(altCol);
          payload[altCol] = removedValue;
        }
      }
      continue;
    }

    const notNullCol = extractNotNullColumnName(error);
    if (notNullCol) {
      console.warn(`[adaptiveInsertSingle] Supplying fallback for NOT NULL column '${notNullCol}' on '${tableName}'.`);
      if (notNullCol === 'sn_no') {
        payload.sn_no = `W-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        continue;
      }
      if (notNullCol.includes('date')) {
        payload[notNullCol] = initialPayload.quotation_date || new Date().toISOString().split('T')[0];
        continue;
      }
      if (notNullCol.includes('cost') || notNullCol.includes('amount') || notNullCol === 'version_no') {
        payload[notNullCol] = 0;
        continue;
      }
      if (payload[notNullCol] === null || payload[notNullCol] === undefined) {
        payload[notNullCol] = '';
        continue;
      }
    }

    const errMsg = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase();
    // Handle NOT NULL violation on sn_no for legacy works schemas
    if (tableName === 'works' && errMsg.includes('sn_no') && !payload.sn_no) {
      payload.sn_no = `W-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      continue;
    }

    console.error(`[adaptiveInsertSingle] Unrecoverable error on '${tableName}':`, {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      payloadKeys: Object.keys(payload),
    });
    return { data: null, error };
  }
  return { data: null, error: new Error(`Adaptive insert into ${tableName} exceeded max retries`) };
};

// Self-healing update that automatically strips any columns not present in the live database schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adaptiveUpdateById = async (tableName: string, recordId: string, initialPayload: Record<string, any>) => {
  const liveCols = await getLiveTableColumns(tableName);
  const payload = alignPayloadToLiveColumns(tableName, initialPayload, liveCols);
  const triedAlternates = new Set<string>();
  for (let attempt = 0; attempt < 20; attempt++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(tableName as any) as any)
      .update(payload)
      .eq('id', recordId);

    if (!error) return { error: null };

    const missingCol = extractMissingColumnName(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(payload, missingCol)) {
      const removedValue = payload[missingCol];
      console.warn(`[adaptiveUpdateById] Stripping missing column '${missingCol}' from '${tableName}' update payload and retrying.`);
      delete payload[missingCol];

      if (tableName === 'quotations' && QUOTATION_ALTERNATE_COLUMNS[missingCol]) {
        const altCol = QUOTATION_ALTERNATE_COLUMNS[missingCol];
        if (!triedAlternates.has(altCol) && !Object.prototype.hasOwnProperty.call(payload, altCol) && (!liveCols || liveCols.includes(altCol))) {
          triedAlternates.add(altCol);
          payload[altCol] = removedValue;
        }
      }
      continue;
    }

    console.error(`[adaptiveUpdateById] Unrecoverable error on '${tableName}':`, {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      payloadKeys: Object.keys(payload),
    });
    return { error };
  }
  return { error: new Error(`Adaptive update on ${tableName} exceeded max retries`) };
};

export default function QuotationGenerator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { profile } = useAuth();
  const actorName = profile?.full_name || 'Someone';
  const componentRef = useRef<HTMLDivElement>(null);
  const logoPath = '/Quotation-logo.png';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialNavState = (location.state as any) || {};
  const initialLocalMeta = id ? getLocalQuoteMeta([id]) : null;
  const initialMode: 'DETAIL' | 'LUMPSUM' | 'PERCENTAGE' =
    initialNavState.quoteMode === 'LUMPSUM' || initialNavState.quoteMode === 'PERCENTAGE' || initialNavState.quoteMode === 'DETAIL'
      ? initialNavState.quoteMode
      : (initialLocalMeta?.quoteMode || 'DETAIL');

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(Boolean(id));
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [originalUbqn, setOriginalUbqn] = useState<string>('');
  const [existingWorkName, setExistingWorkName] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [quoteMode, setQuoteMode] = useState<'DETAIL' | 'LUMPSUM' | 'PERCENTAGE'>(initialMode);
  const [showTerms, setShowTerms] = useState<boolean>(
    typeof initialNavState.showTerms === 'boolean'
      ? initialNavState.showTerms
      : Boolean(initialLocalMeta?.showTerms)
  );
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty);

  const [termsData, setTermsData] = useState(
    initialNavState.termsData && Array.isArray(initialNavState.termsData.stages)
      ? initialNavState.termsData
      : initialLocalMeta?.termsData && Array.isArray(initialLocalMeta.termsData.stages)
        ? initialLocalMeta.termsData
        : {
            stages: [
              { percentage: '50%', label: 'as advance, before mobilization.' },
              { percentage: '30%', label: 'after submitting the Draft report.' },
              { percentage: '20%', label: 'after submitting the Final report.' }
            ]
          }
  );
  const [notes, setNotes] = useState<string[]>(
    Array.isArray(initialNavState.notes)
      ? initialNavState.notes
      : Array.isArray(initialLocalMeta?.notes)
        ? initialLocalMeta.notes
        : ["GST as applicable will be extra."]
  );
  const isEditMode = location.pathname.includes('/edit/');

  const [header, setHeader] = useState({
    ubqn: '',
    firm: 'URBANBUILD™',
    subsidiary: '',
    ubSection: '',
    division_id: '',
    subCategory: '',
    date: '', // Made optional, defaults to empty
    client: 'Executive Engineer',
    division_display: '',
    department: '',
    address: '',
    subject: '',
    reference: '',
    docType: 'Quotation',
  });

interface QuotationRow {
  sn: string;
  particular: string;
  rate: number | string;
  unit: string;
  qty: number | string;
  amount: number | string;
}

  const [rows, setRows] = useState<QuotationRow[]>([
    { sn: '1', particular: '', rate: 0, unit: initialMode === 'LUMPSUM' ? 'Lumpsum' : '', qty: initialMode === 'LUMPSUM' ? 1 : 0, amount: 0 }
  ]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${header.docType || 'Quotation'}-${(buildCanonicalUbqn(header.ubqn, header.ubSection, header.docType) || (id && originalUbqn ? originalUbqn : '000')).toString().replace(/\s/g, '_').replace(/\//g, '-')}`,
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
        title: "Print Warning",
        description: "Unable to open print dialog automatically.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    async function fetchDivisions() {
      const { data } = await supabase.from('divisions').select('*');
      const ensured = await ensureWreDivision(data, supabase);
      setDivisions(ensured);
    }
    fetchDivisions();
  }, []);

  // Sync missing division_id for legacy quotations once divisions are loaded
  useEffect(() => {
    if (!header.division_id && header.ubSection && divisions.length > 0) {
      const matched = divisions.find(d =>
        d.code.toLowerCase() === header.ubSection.toLowerCase() ||
        (d.code === 'Ar' && header.ubSection.toLowerCase() === 'arch') ||
        (d.code.toLowerCase() === 'arch' && header.ubSection.toLowerCase() === 'ar')
      );
      if (matched) {
        setHeader(prev => ({ ...prev, division_id: matched.id }));
      }
    }
  }, [divisions, header.division_id, header.ubSection]);

  const loadQuotationData = useCallback(async () => {
    if (!id) return;
    setIsLoadingQuote(true);
    try {
      const { data: quote, error: qError } = await supabase.from('quotations').select('*').eq('id', id).single();
      if (qError) throw qError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: items, error: iError } = await supabase.from('quotation_items' as any).select('*').eq('quotation_id', id).order('id', { ascending: true });
      if (iError) throw iError;

      const storedQuoteUbqn = (quote.ubqn || '').trim();
      setOriginalUbqn(storedQuoteUbqn);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const navState = (location.state as any) || {};
      const localMeta = getLocalQuoteMeta([id, quote.work_id, storedQuoteUbqn]);

      let savedQuoteMode: 'DETAIL' | 'LUMPSUM' | 'PERCENTAGE' | null =
        navState.quoteMode === 'LUMPSUM' || navState.quoteMode === 'PERCENTAGE' || navState.quoteMode === 'DETAIL'
          ? navState.quoteMode
          : (localMeta?.quoteMode || null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let savedMetaItems: any[] | null = Array.isArray(navState.quoteItems)
        ? navState.quoteItems
        : (Array.isArray(localMeta?.quoteItems) ? localMeta.quoteItems : null);

      if (quote.work_id) {
        try {
          const { data: workData } = await supabase
            .from('works')
            .select('*')
            .eq('id', quote.work_id)
            .maybeSingle();
          setExistingWorkName(workData ? (workData.work_name ?? null) : null);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawMeta = (workData as any)?.metadata;
          if (rawMeta && typeof rawMeta === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meta = rawMeta as any;
            if (!savedQuoteMode && (meta.quote_mode === 'LUMPSUM' || meta.quote_mode === 'PERCENTAGE' || meta.quote_mode === 'DETAIL')) {
              savedQuoteMode = meta.quote_mode;
            } else if (!savedQuoteMode && meta.percentage_mode === true) {
              savedQuoteMode = 'PERCENTAGE';
            }
            if (!savedMetaItems && Array.isArray(meta.quote_items) && meta.quote_items.length > 0) {
              savedMetaItems = meta.quote_items;
            }
            if (Array.isArray(meta.quote_notes)) {
              setNotes(meta.quote_notes);
            }
            if (typeof meta.quote_show_terms === 'boolean') {
              setShowTerms(meta.quote_show_terms);
            }
            if (meta.quote_terms_data && typeof meta.quote_terms_data === 'object' && Array.isArray(meta.quote_terms_data.stages)) {
              setTermsData(meta.quote_terms_data);
            }
          }
        } catch (wErr) {
          console.warn('Could not load linked work metadata:', wErr);
        }
      } else {
        setExistingWorkName(null);
      }

      if (Array.isArray(navState.notes)) {
        setNotes(navState.notes);
      } else if (Array.isArray(localMeta?.notes)) {
        setNotes(localMeta.notes);
      }
      if (typeof navState.showTerms === 'boolean') {
        setShowTerms(navState.showTerms);
      } else if (typeof localMeta?.showTerms === 'boolean') {
        setShowTerms(localMeta.showTerms);
      }
      if (navState.termsData && typeof navState.termsData === 'object' && Array.isArray(navState.termsData.stages)) {
        setTermsData(navState.termsData);
      } else if (localMeta?.termsData && typeof localMeta.termsData === 'object' && Array.isArray(localMeta.termsData.stages)) {
        setTermsData(localMeta.termsData);
      }

      const parsedUbqn = parseEstablishedUbqn(storedQuoteUbqn);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawQuote = quote as any;
      const authoritativeSector = parsedUbqn.sector || rawQuote.section || rawQuote.ub_section || '';
      const authoritativeDocType = parsedUbqn.docType || (quote.ubqn?.includes('(T)') ? 'Tender' : quote.ubqn?.includes('(H)') ? 'HR' : 'Quotation');

      const loadedDate = rawQuote.quotation_date || rawQuote.date || localMeta?.date || '';

      setHeader({
        ubqn: parsedUbqn.core || storedQuoteUbqn,
        firm: rawQuote.firm || localMeta?.firm || 'URBANBUILD™',
        subsidiary: rawQuote.subsidiary || localMeta?.subsidiary || '',
        ubSection: authoritativeSector === 'Arch' ? 'Ar' : authoritativeSector,
        division_id: rawQuote.division_id || localMeta?.division_id || '',
        subCategory: rawQuote.subcategory || rawQuote.sub_category || localMeta?.subCategory || '',
        date: loadedDate,
        client: rawQuote.client_name || localMeta?.client || 'Executive Engineer',
        division_display: rawQuote.division_name || rawQuote.division || localMeta?.division_display || '',
        department: rawQuote.department_name || rawQuote.department || localMeta?.department || '',
        address: rawQuote.address || localMeta?.address || '',
        subject: rawQuote.subject || localMeta?.subject || '',
        reference: rawQuote.reference_no || rawQuote.reference || localMeta?.reference || '',
        docType: authoritativeDocType,
      });

      let detectedEmbeddedMode: 'DETAIL' | 'LUMPSUM' | 'PERCENTAGE' | null = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mappedItems = ((items || []) as any[]).map((item: any, idx: number) => {
        const { cleanUnit, embeddedMode, embeddedAmount } = decodeUnitWithMeta(item.unit);
        if (embeddedMode && !detectedEmbeddedMode) {
          detectedEmbeddedMode = embeddedMode;
        }
        const effectiveMode = savedQuoteMode || embeddedMode || detectedEmbeddedMode;
        const metaItem = savedMetaItems?.[idx];
        const restoredAmount = effectiveMode === 'PERCENTAGE'
          ? (embeddedAmount !== null && embeddedAmount !== ''
              ? embeddedAmount
              : (metaItem && metaItem.amount !== undefined ? metaItem.amount : item.amount))
          : item.amount;

        return {
          sn: item.sn,
          particular: item.description || item.particular || '',
          rate: Number(item.rate),
          unit: cleanUnit,
          qty: Number(item.qty),
          amount: restoredAmount
        };
      });

      if (!savedQuoteMode && detectedEmbeddedMode) {
        savedQuoteMode = detectedEmbeddedMode;
      }

      if (mappedItems.length === 0 && savedMetaItems && savedMetaItems.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mappedItems = savedMetaItems.map((m: any, idx: number) => ({
          sn: m.sn || String(idx + 1),
          particular: m.particular || m.description || '',
          rate: Number(m.rate) || 0,
          unit: decodeUnitWithMeta(m.unit).cleanUnit,
          qty: Number(m.qty) || 1,
          amount: m.amount ?? 0
        }));
      }

      // Determine quote mode based on saved mode, embedded tag, or item structure
      let resolvedMode: 'DETAIL' | 'LUMPSUM' | 'PERCENTAGE' = 'DETAIL';
      if (savedQuoteMode) {
        resolvedMode = savedQuoteMode;
      } else {
        const hasStringAmount = mappedItems.some(i => typeof i.amount === 'string' && isNaN(Number(i.amount)));
        if (hasStringAmount) {
          resolvedMode = 'PERCENTAGE';
        } else if (
          mappedItems.length > 0 &&
          mappedItems.every(i =>
            Number(i.qty) === 1 &&
            (
              i.unit.toLowerCase().includes('lumpsum') ||
              i.unit.toLowerCase() === 'ls' ||
              i.unit.toLowerCase() === 'job' ||
              (Number(i.rate) > 0 && Number(i.rate) === Number(i.amount))
            )
          )
        ) {
          resolvedMode = 'LUMPSUM';
        } else {
          resolvedMode = 'DETAIL';
        }
      }
      setQuoteMode(resolvedMode);

      mappedItems.sort((a: { sn?: string | number }, b: { sn?: string | number }) => {
        const snA = (a.sn || '').toString();
        const snB = (b.sn || '').toString();
        return snA.localeCompare(snB, undefined, { numeric: true, sensitivity: 'base' });
      });

      if (mappedItems.length > 0) {
        setRows(mappedItems);
      }
    } catch (error) {
      console.error("Error loading quotation:", error);
      toast({
        title: "Error Loading Quotation",
        description: getReadableError(error) || "Could not load quotation details",
        variant: "destructive"
      });
    } finally {
      setIsLoadingQuote(false);
    }
  }, [id, location.state, toast]);

  useEffect(() => {
    loadQuotationData();
  }, [loadQuotationData]);

  const handlePrintAndReload = async () => {
    handlePrint();
  };

  const handleQuoteModeChange = (newMode: 'DETAIL' | 'LUMPSUM' | 'PERCENTAGE') => {
    setQuoteMode(newMode);
    setIsDirty(true);
    setRows(prevRows =>
      prevRows.map(row => {
        if (newMode === 'LUMPSUM') {
          const amt = Number(row.rate) || Number(row.amount) || 0;
          return { ...row, qty: 1, rate: amt, amount: amt, unit: row.unit?.trim() ? row.unit : 'Lumpsum' };
        } else if (newMode === 'PERCENTAGE') {
          return { ...row, qty: 1, rate: 0, amount: row.amount };
        } else {
          const isStringAmount = typeof row.amount === 'string' && isNaN(Number(row.amount));
          const computedAmount = isStringAmount ? 0 : (Number(row.rate) || 0) * (Number(row.qty) || 0);
          return { ...row, amount: computedAmount };
        }
      })
    );
  };

  const updateRow = (index: number, field: string, value: string | number) => {
    setRows(prevRows => {
      const newRows = [...prevRows];
      const updatedRow = { ...newRows[index], [field]: value };

      const r = parseFloat(String(field === 'rate' ? value : updatedRow.rate)) || 0;
      const q = parseFloat(String(field === 'qty' ? value : updatedRow.qty)) || 0;

      if (quoteMode === 'PERCENTAGE') {
        // In percentage mode we keep the amount string as-is; no numeric calculation needed.
      } else if (quoteMode === 'LUMPSUM') {
        updatedRow.qty = 1;
        updatedRow.amount = r;
      } else {
        updatedRow.amount = r * q;
      }

      newRows[index] = updatedRow;
      return newRows;
    });
  };

  const numericTotal = useMemo(() => {
    if (quoteMode === 'PERCENTAGE') return 0;
    return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  }, [rows, quoteMode]);

  const displayTotal = useMemo(() => {
    if (quoteMode === 'PERCENTAGE') {
      return rows.map(r => r.amount).filter(Boolean).join(" + ");
    }
    return `₹${numericTotal.toLocaleString('en-IN')}`;
  }, [rows, numericTotal, quoteMode]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const snA = (a.sn || '').toString();
      const snB = (b.sn || '').toString();
      return snA.localeCompare(snB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [rows]);

  const isSectorDisabled = useMemo(() => {
    if (header.firm === 'URBANBUILD™') return false; // Enabled for main firm (Consultancy default)
    if (header.firm === 'URBANBUILD™ Pvt. Ltd.' && header.subsidiary === 'Consultancy') return false; // Enabled for Consultancy subsidiary
    return true; // Disabled otherwise
  }, [header.firm, header.subsidiary]);

  const handleGenerateAndSync = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    // Validation: division must be selected for consultancy, or fallback for other subsidiaries
    let effectiveDivisionId = header.division_id;
    if (!effectiveDivisionId && isSectorDisabled && divisions.length > 0) {
      const realDiv = divisions.find(d => d.id !== 'wre-sector-fallback');
      effectiveDivisionId = realDiv ? realDiv.id : divisions[0].id;
    }

    if (!effectiveDivisionId) {
      toast({
        title: "Validation Error",
        description: "Please select a UB Sector before generating.",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }
    if (header.ubSection === 'RnB' && !header.subCategory && !isSectorDisabled) {
      toast({
        title: "Validation Error",
        description: "Please select either Road or Bridge sub-type.",
        variant: "destructive",
      });
      return;
    }
    if (!header.ubqn || !header.ubqn.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a UBQN number before generating.",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    try {
      let currentQuoteId = id;
      const lineItems = rows.map(row => {
        // Robust numeric parsing: prevent Postgres numeric conversion crash from strings like "-", "", etc.
        const parsedRate = typeof row.rate === 'number' ? row.rate : parseFloat(String(row.rate).replace(/[^0-9.-]/g, ''));
        const safeRate = !isNaN(parsedRate) && isFinite(parsedRate) ? parsedRate : 0;

        const parsedQty = typeof row.qty === 'number' ? row.qty : parseFloat(String(row.qty).replace(/[^0-9.-]/g, ''));
        const defaultQty = (quoteMode === 'LUMPSUM' || quoteMode === 'PERCENTAGE') ? 1 : 0;
        const safeQty = !isNaN(parsedQty) && isFinite(parsedQty) ? parsedQty : defaultQty;

        let safeAmount = 0;
        if (quoteMode === 'PERCENTAGE') {
          const parsedAmt = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount).replace(/[^0-9.-]/g, ''));
          safeAmount = !isNaN(parsedAmt) && isFinite(parsedAmt) ? parsedAmt : 0;
        } else if (quoteMode === 'LUMPSUM') {
          safeAmount = safeRate;
        } else {
          safeAmount = safeRate * safeQty;
        }

        return {
          sn: String(row.sn || '').trim() || '1',
          description: String(row.particular || '').trim(),
          rate: safeRate,
          unit: encodeUnitWithMeta(String(row.unit || '').trim(), quoteMode, row.amount),
          qty: safeQty,
          amount: safeAmount,
        };
      });

      const rawItemsForMetadata = rows.map(row => ({
        sn: String(row.sn || '').trim() || '1',
        particular: String(row.particular || '').trim(),
        rate: Number(row.rate) || 0,
        unit: decodeUnitWithMeta(String(row.unit || '').trim()).cleanUnit,
        qty: (quoteMode === 'LUMPSUM' || quoteMode === 'PERCENTAGE') ? 1 : (Number(row.qty) || 0),
        amount: row.amount,
      }));

      const saveNumericTotal = quoteMode === 'PERCENTAGE'
        ? 0
        : lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      // Build canonical UBQN and standardized Work UBQN
      const fullUBQN = buildCanonicalUbqn(header.ubqn, header.ubSection, header.docType) || (isEditMode && originalUbqn ? originalUbqn.trim() : header.ubqn.trim());
      const standardizedSector = !isSectorDisabled && header.ubSection
        ? (header.ubSection === 'Ar' ? 'Arch' : header.ubSection)
        : '';
      const rawCoreUbqn = parseEstablishedUbqn(header.ubqn).core || header.ubqn.trim();
      const standardizedWorkUbqn = standardizedSector ? `${standardizedSector}- ${rawCoreUbqn}` : rawCoreUbqn;

      // Resolve division against the divisions table (gracefully handling WRE client-side fallback if needed)
      let resolvedDivisionId = effectiveDivisionId;
      if (effectiveDivisionId === 'wre-sector-fallback') {
        const { data: wreDivs } = await supabase
          .from('divisions')
          .select('id')
          .ilike('code', 'WRE')
          .order('created_at', { ascending: true })
          .limit(1);
        const wreDiv = Array.isArray(wreDivs) && wreDivs.length > 0 ? wreDivs[0] : null;
        if (wreDiv?.id) {
          resolvedDivisionId = wreDiv.id;
        } else {
          const fallbackDiv = divisions.find(d => d.id !== 'wre-sector-fallback');
          if (fallbackDiv) {
            resolvedDivisionId = fallbackDiv.id;
          } else {
            const { data: anyDiv } = await supabase.from('divisions').select('id').limit(1).maybeSingle();
            if (!anyDiv?.id) throw new Error('No divisions exist in the database. Please configure divisions first.');
            resolvedDivisionId = anyDiv.id;
          }
        }
      } else {
        const { data: divRecord, error: divErr } = await supabase
          .from('divisions')
          .select('id')
          .eq('id', effectiveDivisionId)
          .maybeSingle();
        if (divErr) throw divErr;
        if (divRecord?.id) {
          resolvedDivisionId = divRecord.id;
        } else {
          const fallbackDiv = divisions.find(d => d.id !== 'wre-sector-fallback');
          if (fallbackDiv) resolvedDivisionId = fallbackDiv.id;
        }
      }

      const secureSection = !isSectorDisabled
        ? (header.ubSection === 'Ar' ? 'Arch' : header.ubSection)
        : '';

      const clientShort = header.client ? getShorthand(header.client) : '';
      const divShort = header.division_display ? getShorthand(header.division_display) : '';
      const deptShort = header.department ? getShorthand(header.department) : '';
      const reflectedClient = [clientShort, divShort, deptShort, header.address].filter(Boolean).join(" ")
        || [header.client, header.division_display, header.department, header.address].filter(Boolean).join(" ")
        || 'Client';

      const quotationDateValue = header.date && header.date.trim() ? header.date.trim() : null;

      // Resolve or create the linked Work record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let existingWork: any = null;

      if (isEditMode && id) {
        const { data: quoteRecord } = await supabase
          .from('quotations')
          .select('work_id')
          .eq('id', id)
          .maybeSingle();

        if (quoteRecord?.work_id) {
          const { data: wData } = await supabase
            .from('works')
            .select('*')
            .eq('id', quoteRecord.work_id)
            .maybeSingle();
          if (wData) existingWork = wData;
        }
      }

      // If no linked work yet, search by UBQN variants (canonical, standardized, or core)
      if (!existingWork) {
        const ubqnCandidates = Array.from(new Set([
          fullUBQN,
          standardizedWorkUbqn,
          rawCoreUbqn,
          ...(originalUbqn ? [originalUbqn.trim()] : [])
        ].filter(Boolean)));

        for (const candidate of ubqnCandidates) {
          const { data: foundByUbqn, error: ubqnSearchErr } = await supabase
            .from('works')
            .select('*')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .ilike('ubqn' as any, candidate)
            .order('created_at', { ascending: false })
            .limit(1);
          if (foundByUbqn && foundByUbqn.length > 0) {
            existingWork = foundByUbqn[0];
            break;
          }
          // Fallback if 'ubqn' column does not exist on works table (search qtn_no or sn_no instead)
          if (ubqnSearchErr && extractMissingColumnName(ubqnSearchErr) === 'ubqn') {
            const { data: foundByQtn } = await supabase
              .from('works')
              .select('*')
              .ilike('qtn_no', candidate)
              .order('created_at', { ascending: false })
              .limit(1);
            if (foundByQtn && foundByQtn.length > 0) {
              existingWork = foundByQtn[0];
              break;
            }
          }
        }
      }

      let targetWorkId: string | null = null;

      if (!existingWork) {
        const newWorkMetadata = {
          type: 'Quotation',
          include_gst: true,
          base_cost: saveNumericTotal,
          quote_mode: quoteMode,
          percentage_mode: quoteMode === 'PERCENTAGE',
          display_total: quoteMode === 'PERCENTAGE' ? displayTotal : null,
          quote_items: rawItemsForMetadata,
          quote_notes: notes,
          quote_show_terms: showTerms,
          quote_terms_data: termsData,
        };

        const fullWorkInsertPayload = {
          ubqn: standardizedWorkUbqn || fullUBQN,
          work_name: header.subject?.trim() || 'Quotation Work',
          client_name: reflectedClient,
          division_id: resolvedDivisionId,
          subcategory: header.ubSection === 'RnB' ? (header.subCategory as "Road" | "Bridge") : null,
          consultancy_cost: saveNumericTotal,
          status: 'Pipeline' as Work['status'],
          metadata: newWorkMetadata,
        };

        const { data: createdWork, error: createWorkErr } = await adaptiveInsertSingle('works', fullWorkInsertPayload);

        if (createdWork?.id) {
          targetWorkId = createdWork.id;
        } else {
          console.warn('Could not auto-create work record, proceeding with quotation save:', createWorkErr);
        }
      } else {
        targetWorkId = existingWork.id;
        const currentMeta = (existingWork.metadata && typeof existingWork.metadata === 'object' && !Array.isArray(existingWork.metadata))
          ? existingWork.metadata
          : {};

        const updatedMeta = {
          ...currentMeta,
          type: currentMeta.type || 'Quotation',
          include_gst: true,
          base_cost: saveNumericTotal,
          quote_mode: quoteMode,
          percentage_mode: quoteMode === 'PERCENTAGE',
          display_total: quoteMode === 'PERCENTAGE' ? displayTotal : null,
          quote_items: rawItemsForMetadata,
          quote_notes: notes,
          quote_show_terms: showTerms,
          quote_terms_data: termsData,
        };

        // Preserve work_name if the work is already Running/Completed, otherwise sync from subject if changed
        const shouldUpdateWorkName = existingWork.status === 'Pipeline' && header.subject?.trim();
        const resolvedWorkName = shouldUpdateWorkName
          ? header.subject.trim()
          : (existingWork.work_name ?? existingWorkName ?? header.subject?.trim() ?? 'Quotation Work');

        const { error: updateWorkErr } = await adaptiveUpdateById('works', targetWorkId, {
          work_name: resolvedWorkName,
          client_name: reflectedClient,
          consultancy_cost: saveNumericTotal,
          division_id: resolvedDivisionId,
          subcategory: header.ubSection === 'RnB' ? (header.subCategory as "Road" | "Bridge") : null,
          updated_at: new Date().toISOString(),
          metadata: updatedMeta,
        });

        if (updateWorkErr) {
          console.warn('Could not update linked work record, proceeding with quotation save:', updateWorkErr);
        }
      }

      // Quotation payload
      const quotePayload = {
        work_id: targetWorkId,
        division_id: resolvedDivisionId,
        ubqn: fullUBQN,
        firm: header.firm,
        subsidiary: header.subsidiary,
        section: secureSection,
        subcategory: header.subCategory || null,
        quotation_date: quotationDateValue,
        client_name: header.client,
        division_name: header.division_display,
        department_name: header.department,
        address: header.address,
        subject: header.subject,
        reference_no: header.reference,
        consultancy_cost: saveNumericTotal,
      };

      if (isEditMode && id) {
        const { error: updateQuoteErr } = await adaptiveUpdateById('quotations', id, quotePayload);

        if (updateQuoteErr) {
          throw updateQuoteErr;
        }
        currentQuoteId = id;

        // Replace quotation line items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: delItemsErr } = await supabase
          .from('quotation_items' as any)
          .delete()
          .eq('quotation_id', currentQuoteId);

        if (delItemsErr) {
          throw delItemsErr;
        }
      } else {
        const { data: newQuote, error: insertQuoteErr } = await adaptiveInsertSingle('quotations', quotePayload);

        if (insertQuoteErr || !newQuote) {
          throw insertQuoteErr || new Error('Failed to save quotation');
        }
        currentQuoteId = newQuote.id;
      }

      if (lineItems.length > 0 && currentQuoteId) {
        const liveItemCols = await getLiveTableColumns('quotation_items');
        let itemsWithQuoteId = lineItems.map(item =>
          alignPayloadToLiveColumns('quotation_items', {
            ...item,
            quotation_id: currentQuoteId,
          }, liveItemCols)
        );
        for (let attempt = 0; attempt < 8; attempt++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: insertItemsErr } = await supabase
            .from('quotation_items' as any)
            .insert(itemsWithQuoteId);

          if (!insertItemsErr) break;

          const missingItemCol = extractMissingColumnName(insertItemsErr);
          if (missingItemCol && itemsWithQuoteId.length > 0 && Object.prototype.hasOwnProperty.call(itemsWithQuoteId[0], missingItemCol)) {
            console.warn(`[quotation_items] Stripping missing column '${missingItemCol}' and retrying.`);
            const altCol = QUOTATION_ITEM_ALTERNATE_COLUMNS[missingItemCol];
            itemsWithQuoteId = itemsWithQuoteId.map(row => {
              const copy = { ...row } as Record<string, unknown>;
              const removedVal = copy[missingItemCol];
              delete copy[missingItemCol];
              if (altCol && !Object.prototype.hasOwnProperty.call(copy, altCol)) {
                copy[altCol] = removedVal;
              }
              return copy as typeof row;
            });
            continue;
          }

          throw insertItemsErr;
        }
      }

      // Persist mode, displayTotal, items, notes, T&C, and header fallbacks in localStorage by quotation ID, work ID, and UBQN
      saveLocalQuoteMeta(
        [currentQuoteId, targetWorkId, fullUBQN, standardizedWorkUbqn, rawCoreUbqn],
        {
          quoteMode,
          displayTotal: quoteMode === 'PERCENTAGE' ? displayTotal : null,
          quoteItems: rawItemsForMetadata,
          notes,
          showTerms,
          termsData,
          date: quotationDateValue,
          firm: header.firm,
          subsidiary: header.subsidiary,
          division_id: resolvedDivisionId,
          subCategory: header.subCategory || null,
          client: header.client,
          division_display: header.division_display,
          department: header.department,
          address: header.address,
          subject: header.subject,
          reference: header.reference,
        }
      );

      setIsDirty(false);

      toast({
        title: isEditMode ? "Quotation Updated" : "Quotation Generated",
        description: `Successfully saved ${fullUBQN} and synced with Works Pipeline.`,
      });

      // Notify Directors/Admins
      notifyDirectors({
        type: 'quotation_created',
        title: isEditMode ? 'Quotation Updated' : 'New Quotation Generated',
        message: isEditMode
          ? `${actorName} updated quotation for "${header.subject}" (UBQN: ${fullUBQN})`
          : `${actorName} generated a new quotation for "${header.subject}" (UBQN: ${fullUBQN})`,
        link: '/quotations',
        metadata: { ubqn: fullUBQN, subject: header.subject, actor: actorName },
      });

      // Navigate to the quotation view so the user can print or review directly
      navigate(`/quotations/view/${currentQuoteId}`, {
        state: {
          quoteMode,
          quoteItems: rawItemsForMetadata,
          notes,
          showTerms,
          termsData,
        }
      });
    } catch (error: unknown) {
      console.error(error);
      toast({
        title: "Unable to save quotation",
        description: getReadableError(error) || (error instanceof Error ? error.message : typeof error === 'object' && error !== null ? JSON.stringify(error, null, 2) : String(error)),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-56px)] md:h-screen bg-slate-50 p-4 font-sans">
      {(!id || isEditMode) && (
        <div
          className="w-full lg:w-1/3 shrink-0 bg-white p-5 rounded-lg shadow-sm border border-slate-200 overflow-y-auto"
          onChange={() => setIsDirty(true)}
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate('/quotations')} className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600">
              <ArrowLeft size={14} /> Back
            </button>
            <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="bg-blue-600 text-white p-1 rounded">
                {isEditMode ? <Save size={14} /> : <Plus size={14} />}
              </span>
              {isEditMode ? 'Edit Mode' : id ? 'Reprint Mode' : `New ${header.docType || 'Quotation'}`}
            </div>
          </div>

          {isLoadingQuote ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Loader2 className="animate-spin mb-3 text-blue-600" size={32} />
              <p className="text-xs font-semibold text-slate-600">Loading quotation details...</p>
            </div>
          ) : (
            <>
              <div className="space-y-5 mb-8">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Firm</label>
                  <select
                    value={header.firm}
                    onChange={e => {
                      const nextFirm = e.target.value;
                      const nextSub = nextFirm === 'URBANBUILD™' ? '' : header.subsidiary;
                      const nextDisabled = nextFirm !== 'URBANBUILD™' && nextSub !== 'Consultancy';
                      setHeader({
                        ...header,
                        firm: nextFirm,
                        subsidiary: nextSub,
                        ...(nextDisabled ? { ubSection: '', subCategory: '' } : {})
                      });
                    }}
                    className="w-full border p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50"
                  >
                    <option value="URBANBUILD™">URBANBUILD™</option>
                    <option value="URBANBUILD™ Pvt. Ltd.">URBANBUILD™ Pvt. Ltd.</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subsidiary</label>
                  <select
                    value={header.subsidiary}
                    onChange={e => {
                      const nextSub = e.target.value;
                      const nextDisabled = header.firm !== 'URBANBUILD™' && nextSub !== 'Consultancy';
                      setHeader({
                        ...header,
                        subsidiary: nextSub,
                        ...(nextDisabled ? { ubSection: '', subCategory: '' } : {})
                      });
                    }}
                    disabled={header.firm === 'URBANBUILD™'}
                    className="w-full border p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UB Sector</label>
                  <select
                    value={header.division_id}
                    onChange={e => {
                      const selected = divisions.find(d => d.id === e.target.value);
                      setHeader({
                        ...header,
                        division_id: e.target.value,
                        ubSection: selected?.code || '',
                        subCategory: ''
                      });
                    }}
                    disabled={isSectorDisabled}
                    className="w-full border p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Select UB Sector</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code === 'Ar' ? 'Arch' : d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Doc Type</label>
                  <select
                    value={header.docType}
                    onChange={e => setHeader({ ...header, docType: e.target.value })}
                    className="w-full border p-2.5 rounded-lg text-xs font-bold text-blue-600 focus:ring-1 focus:ring-blue-500 outline-none bg-blue-50/30"
                  >
                    <option value="Quotation">Quotation (Q)</option>
                    <option value="Tender">Tender (T)</option>
                    <option value="HR">HR (H)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UBQN No</label>
                  <input type="text" value={header.ubqn} onChange={e => setHeader({ ...header, ubqn: e.target.value })} className="w-full border p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50" />
                </div>
              </div>
            </div>

            {header.ubSection === 'RnB' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3">
                  RnB Sub-Type Selection <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setHeader({ ...header, subCategory: 'Road' })}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg border transition-all ${header.subCategory === 'Road' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-100'}`}>ROAD</button>
                  <button type="button" onClick={() => setHeader({ ...header, subCategory: 'Bridge' })}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg border transition-all ${header.subCategory === 'Bridge' ? 'bg-cyan-600 text-white border-cyan-600 shadow-md' : 'bg-white text-cyan-600 border-cyan-200 hover:bg-cyan-100'}`}>BRIDGE</button>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Date</label>
                <button
                  type="button"
                  onClick={() => setHeader(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }))}
                  className="text-[9px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                  title="Set today's date"
                >
                  <Calendar size={10} /> Today
                </button>
              </div>
              <input type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} className="w-full border p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50" />
            </div>

            <div className="border-t border-slate-200 pt-5 space-y-4">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Recipient Details</p>

              {/* Recipient Title */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Recipient Title</label>
                <div className="flex gap-2">
                  <select
                    value={RECIPIENT_TITLE_OPTIONS.includes(header.client) ? header.client : (header.client ? '__OTHER__' : '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__OTHER__') {
                        // Keep current or clear to allow typing custom title
                        if (RECIPIENT_TITLE_OPTIONS.includes(header.client)) {
                          setHeader({ ...header, client: '' });
                        }
                      } else {
                        setHeader({ ...header, client: val });
                      }
                    }}
                    className="flex-1 border p-2.5 rounded-lg text-xs font-medium outline-none bg-slate-50/50 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Title --</option>
                    {RECIPIENT_TITLE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt} ({getShorthand(opt)})</option>
                    ))}
                    <option value="__OTHER__">Other / Custom Title</option>
                  </select>
                  {getShorthand(header.client) && (
                    <span className="shrink-0 self-center bg-amber-100 text-amber-700 border border-amber-200 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">
                      {getShorthand(header.client)}
                    </span>
                  )}
                </div>
                {(!RECIPIENT_TITLE_OPTIONS.includes(header.client) || header.client === '') && (
                  <input
                    type="text"
                    placeholder="Enter Custom Recipient Title (e.g. Chief Executive Officer)"
                    value={header.client}
                    onChange={e => setHeader({ ...header, client: e.target.value })}
                    className="w-full mt-2 border p-2 rounded-lg text-xs outline-none bg-white focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Division Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Division Name</label>
                <div className="flex gap-2">
                  <select
                    value={RECIPIENT_DIVISION_OPTIONS.includes(header.division_display) ? header.division_display : (header.division_display ? '__OTHER__' : '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__OTHER__') {
                        if (RECIPIENT_DIVISION_OPTIONS.includes(header.division_display)) {
                          setHeader({ ...header, division_display: '' });
                        }
                      } else {
                        setHeader({ ...header, division_display: val });
                      }
                    }}
                    className="flex-1 border p-2.5 rounded-lg text-xs font-medium outline-none bg-slate-50/50 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Division --</option>
                    {RECIPIENT_DIVISION_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt} ({getShorthand(opt)})</option>
                    ))}
                    <option value="__OTHER__">Other / Custom Division</option>
                  </select>
                  {getShorthand(header.division_display) && (
                    <span className="shrink-0 self-center bg-blue-100 text-blue-700 border border-blue-200 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">
                      {getShorthand(header.division_display)}
                    </span>
                  )}
                </div>
                {(!RECIPIENT_DIVISION_OPTIONS.includes(header.division_display) || header.division_display === '') && (
                  <input
                    type="text"
                    placeholder="Enter Custom Division Name (e.g. Special Project Division)"
                    value={header.division_display}
                    onChange={e => setHeader({ ...header, division_display: e.target.value })}
                    className="w-full mt-2 border p-2 rounded-lg text-xs outline-none bg-white focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
                <div className="flex gap-2">
                  <select
                    value={RECIPIENT_DEPARTMENT_OPTIONS.includes(header.department) ? header.department : (header.department ? '__OTHER__' : '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__OTHER__') {
                        if (RECIPIENT_DEPARTMENT_OPTIONS.includes(header.department)) {
                          setHeader({ ...header, department: '' });
                        }
                      } else {
                        setHeader({ ...header, department: val });
                      }
                    }}
                    className="flex-1 border p-2.5 rounded-lg text-xs font-medium outline-none bg-slate-50/50 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Department --</option>
                    {RECIPIENT_DEPARTMENT_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt} ({getShorthand(opt)})</option>
                    ))}
                    <option value="__OTHER__">Other / Custom Department</option>
                  </select>
                  {getShorthand(header.department) && (
                    <span className="shrink-0 self-center bg-emerald-100 text-emerald-700 border border-emerald-200 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">
                      {getShorthand(header.department)}
                    </span>
                  )}
                </div>
                {(!RECIPIENT_DEPARTMENT_OPTIONS.includes(header.department) || header.department === '') && (
                  <input
                    type="text"
                    placeholder="Enter Custom Department (e.g. Irrigation & Flood Control)"
                    value={header.department}
                    onChange={e => setHeader({ ...header, department: e.target.value })}
                    className="w-full mt-2 border p-2 rounded-lg text-xs outline-none bg-white focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Manual Address */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address / Location (Manual)</label>
                <input
                  type="text"
                  placeholder="Enter Address / Location manually (e.g. Lansdowne)"
                  value={header.address}
                  onChange={e => setHeader({ ...header, address: e.target.value })}
                  className="w-full border p-2.5 rounded-lg text-xs outline-none bg-slate-50/50 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {(header.client || header.division_display || header.department || header.address) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Client Name →</span>
                  <span className="text-[10px] font-bold text-slate-700 truncate">
                    {[getShorthand(header.client), getShorthand(header.division_display), getShorthand(header.department), header.address].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Subject</label>
              <input type="text" value={header.subject} onChange={e => setHeader({ ...header, subject: e.target.value })} className="w-full border p-2.5 rounded-lg text-xs outline-none bg-slate-50/50 focus:ring-1 focus:ring-blue-500" />
            </div>

            <div className="border-t border-slate-200 pt-6 mb-6 space-y-5">
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100 gap-3">
                <div className="shrink-0">
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Quotation Mode</p>
                  <p className="text-[10px] text-blue-700 italic font-medium mt-0.5">Select calculation type</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg shadow-sm border border-slate-200 w-full xl:w-auto overflow-x-auto hide-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleQuoteModeChange('DETAIL')}
                    className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${quoteMode === 'DETAIL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-blue-600'}`}
                  >
                    DETAIL
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuoteModeChange('LUMPSUM')}
                    className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${quoteMode === 'LUMPSUM' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-blue-600'}`}
                  >
                    LUMPSUM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuoteModeChange('PERCENTAGE')}
                    className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${quoteMode === 'PERCENTAGE' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-blue-600'}`}
                  >
                    PERCENTAGE
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">T&C Page</p>
                  <p className="text-[10px] text-slate-700 italic font-medium mt-0.5">Add payment & bank details</p>
                </div>
                <button
                  onClick={() => setShowTerms(!showTerms)}
                  className={`flex h-7 w-14 items-center rounded-full px-1 transition-colors ${showTerms ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`h-5 w-5 transform rounded-full bg-white transition-transform ${showTerms ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </div>

              {showTerms && (
                <div className="mt-4 p-4 bg-blue-50/30 border border-blue-100 rounded-xl space-y-3">
                  <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    Payment Stages <span className="text-[9px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded border">(Editable)</span>
                  </p>
                  {termsData.stages.map((stage, i) => (
                    <div key={i} className="flex gap-3 items-start group">
                      <input
                        type="text"
                        value={stage.percentage}
                        onChange={e => {
                          const newStages = [...termsData.stages];
                          newStages[i].percentage = e.target.value;
                          setTermsData({ ...termsData, stages: newStages });
                        }}
                        className="w-16 border p-2 rounded-lg text-xs font-bold text-center bg-white focus:ring-1 focus:ring-blue-500"
                      />
                      <textarea
                        value={stage.label}
                        onChange={e => {
                          const newStages = [...termsData.stages];
                          newStages[i].label = e.target.value;
                          setTermsData({ ...termsData, stages: newStages });
                        }}
                        className="flex-1 border p-2 rounded-lg text-xs bg-white resize-none h-10 leading-tight focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-4 bg-yellow-50/30 border border-yellow-100 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <p className="text-xs font-black text-yellow-800 uppercase tracking-widest mb-1 flex items-center gap-2">
                    Notes <span className="text-[9px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded border">(Editable)</span>
                  </p>
                  <button type="button" onClick={() => setNotes([...notes, ''])} className="text-[10px] font-bold flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2 py-1 rounded hover:bg-yellow-200 transition-colors">
                    <Plus size={12} /> Add Note
                  </button>
                </div>
                {notes.map((note, i) => (
                  <div key={i} className="flex gap-2 items-start group">
                    <span className="text-xs font-bold text-slate-400 mt-2">{i + 1}.</span>
                    <textarea
                      value={note}
                      onChange={e => {
                        const newNotes = [...notes];
                        newNotes[i] = e.target.value;
                        setNotes(newNotes);
                      }}
                      className="flex-1 border p-2 rounded-lg text-xs bg-white resize-none h-10 leading-tight focus:ring-1 focus:ring-yellow-500"
                    />
                    <button type="button" onClick={() => setNotes(notes.filter((_, idx) => idx !== i))} className="mt-1 p-1.5 text-slate-400 hover:text-red-500 rounded bg-white border border-slate-200 hover:border-red-200 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Service Particulars</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRows([...rows, {
                    sn: (rows.length + 1).toString(),
                    particular: '',
                    rate: 0,
                    unit: quoteMode === 'LUMPSUM' ? 'Lumpsum' : '',
                    qty: quoteMode === 'LUMPSUM' ? 1 : 0,
                    amount: 0
                  }])}
                  className="text-[11px] font-bold flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={index} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 relative group shadow-sm hover:border-blue-200 transition-all">
                  <button onClick={() => setRows(rows.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 text-white bg-slate-300 hover:bg-red-500 p-1.5 rounded-full shadow-sm transition-colors"><Trash2 size={12} /></button>
                  <div className="flex gap-3 mb-3">
                    <input placeholder="SN" value={row.sn} onChange={e => updateRow(index, 'sn', e.target.value)} className="w-14 border p-2 rounded-lg text-xs text-center font-medium bg-white focus:ring-1 focus:ring-blue-500" />
                    <textarea placeholder="Description" value={row.particular} onChange={e => updateRow(index, 'particular', e.target.value)} className="flex-1 border p-2 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500" rows={2} />
                  </div>
                  <div className={`grid ${quoteMode === 'LUMPSUM' || quoteMode === 'PERCENTAGE' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-3`}>
                    {quoteMode !== 'PERCENTAGE' && (
                      <input type="number" placeholder={quoteMode === 'LUMPSUM' ? "Amount" : "Rate"} value={row.rate || ''} onChange={e => updateRow(index, 'rate', e.target.value)} className="border p-2 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500" />
                    )}
                    <input placeholder="Unit" value={row.unit} onChange={e => updateRow(index, 'unit', e.target.value)} className="border p-2 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500" />

                    {quoteMode === 'PERCENTAGE' && (
                      <input type="text" placeholder="Amount (Alphanumeric)" value={row.amount || ''} onChange={e => updateRow(index, 'amount', e.target.value)} className="border p-2 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500" />
                    )}

                    {quoteMode === 'DETAIL' && (
                      <>
                        <input type="number" placeholder="Qty" value={row.qty || ''} onChange={e => updateRow(index, 'qty', e.target.value)} className="border p-2 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500" />
                        <div className="bg-white border p-2 rounded-lg text-sm font-black text-blue-700 text-right flex items-center justify-end px-3">₹{Number(row.amount || 0).toLocaleString('en-IN')}</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="mt-8 p-4 bg-slate-900 rounded-xl shadow-lg border border-slate-800 space-y-3">
            {quoteMode !== 'PERCENTAGE' ? (
              <>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Base Amount</span>
                  <span>₹{numericTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                  <span>GST (18%)</span>
                  <span>+ ₹{(numericTotal * 0.18).toLocaleString('en-IN')}</span>
                </div>
                <div className="h-px bg-slate-800 my-1" />
                <div className="flex justify-between items-center text-sm font-black text-white">
                  <span className="uppercase tracking-tight">Total (In Flow)</span>
                  <span className="text-xl">₹{(numericTotal * 1.18).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <p className="text-[9px] text-slate-500 italic mt-2 leading-tight">
                  Note: This total (+18%) will be recorded in the Registry, Works Pipeline, and Financial Dashboards. The PDF for clients will remain without GST.
                </p>
              </>
            ) : (
              <div className="flex justify-between items-center text-sm font-black text-white">
                <span className="uppercase tracking-tight">Total (In Flow)</span>
                <span className="text-xl">{displayTotal}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateAndSync}
            disabled={isSaving || isLoadingQuote}
            className="w-full mt-6 bg-blue-800 text-white py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-blue-900 font-bold text-sm shadow-md transition-all disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {isEditMode ? "Update Quotation" : "Generate Quotation"}
          </button>
            </>
          )}
        </div>
      )}

      <div className="flex-1 bg-gray-200 rounded-lg border border-gray-300 flex flex-col items-center overflow-auto p-4 sm:p-6 gap-4 min-w-0">
        {(id && !isEditMode) && (
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 shrink-0 print:hidden sticky top-0 z-10">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Printer className="text-blue-600" /> Reprint Mode</h2>
              <p className="text-xs font-medium text-slate-500">Preview and print existing quotations directly.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button onClick={() => navigate('/quotations')} className="flex justify-center items-center gap-2 px-5 py-2 bg-slate-100 text-slate-700 font-bold text-sm rounded shadow-sm border border-slate-300 hover:bg-slate-200 transition-colors w-full sm:w-auto">
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={() => navigate(`/quotations/edit/${id}`, { state: { quoteMode, notes, showTerms, termsData } })}
                disabled={isLoadingQuote}
                className="flex justify-center items-center gap-2 px-5 py-2 bg-amber-50 text-amber-700 font-bold text-sm rounded shadow-sm border border-amber-200 hover:bg-amber-100 transition-colors w-full sm:w-auto disabled:opacity-50"
              >
                <Edit3 size={16} /> Edit
              </button>
              <button
                onClick={handlePrintAndReload}
                disabled={isLoadingQuote}
                className="flex justify-center items-center gap-2 px-6 py-2 bg-blue-700 text-white font-bold text-sm rounded shadow-md hover:bg-blue-800 transition-colors w-full sm:w-auto disabled:opacity-50"
              >
                {isLoadingQuote ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />} Print PDF
              </button>
            </div>
          </div>
        )}

        {/* Zoom Control Bar */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-lg shadow-sm px-3 py-1.5 flex items-center gap-2 text-xs text-slate-700 w-full max-w-[210mm] print:hidden">
          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Preview:</span>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
            className="p-1 rounded hover:bg-slate-100 text-slate-600"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="font-mono text-xs font-bold w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(1.4, Number((prev + 0.1).toFixed(2))))}
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
          {(!id || isEditMode) && (
            <>
              <div className="h-3 w-[1px] bg-slate-300 mx-1" />
              <button
                type="button"
                onClick={() => handlePrint()}
                className="ml-auto px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded shadow-sm flex items-center gap-1.5 transition-colors"
                title="Print quotation directly"
              >
                <Printer size={13} /> Print PDF
              </button>
            </>
          )}
        </div>

        {/* Responsive Document Wrapper */}
        {isLoadingQuote && id && !isEditMode ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-500">
            <Loader2 className="animate-spin mb-3 text-blue-600" size={36} />
            <p className="text-sm font-bold text-slate-700">Loading quotation preview...</p>
          </div>
        ) : (
        <div className="w-full flex-1 overflow-x-auto flex flex-col items-center min-w-0 print:overflow-visible">
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
          >
            <div ref={componentRef} className="flex flex-col gap-8 print:gap-0 shrink-0 w-[210mm]">
              <div className="bg-white shadow-2xl flex flex-col relative print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '10mm 15mm' }}>

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

                <div className="flex-1 flex flex-col">
                  {(() => {
                    const rowCount = sortedRows.length;
                    const isLight = rowCount <= 3;     // Very few rows
                    const isMedium = rowCount <= 6;    // Normal density
                    const isHeavy = rowCount <= 10;    // High density
                    const isExtreme = rowCount > 10;   // Maximum density

                    // Vertical Spacing (Margins)
                    const mbSmall = isLight ? 'mb-2' : (isMedium ? 'mb-1.5' : 'mb-1');
                    const mbMed = isLight ? 'mb-4' : (isMedium ? 'mb-3' : (isHeavy ? 'mb-2' : 'mb-1'));
                    const mtMed = isLight ? 'mt-2' : (isMedium ? 'mt-1.5' : 'mt-1');
                    const footerGap = isLight ? 'space-y-8' : (isMedium ? 'space-y-6' : (isHeavy ? 'space-y-4' : 'space-y-2'));

                    // Table Cell Padding
                    const cellPadding = isLight ? 'py-2' : (isMedium ? 'py-1.5' : (isHeavy ? 'py-1' : 'py-0.5'));
                    const headPadding = isLight ? 'py-2' : (isMedium ? 'py-1.5' : 'py-1');

                    return (
                      <>
                        <div className={`flex justify-between font-bold text-[11px] ${mbMed} text-slate-800`}>
                          <p>L.N.: {(() => {
                            if (id && !isEditMode && originalUbqn) {
                              return formatDisplayUbqn(originalUbqn, header.ubSection);
                            }
                            const typeChar = header.docType === 'Tender' ? 'T' : header.docType === 'HR' ? 'H' : 'Q';
                            if (!header.ubqn?.trim()) return `__ (${typeChar})- ____`;
                            return buildCanonicalUbqn(header.ubqn, header.ubSection, header.docType);
                          })()}</p>
                          <p>{header.date ? `Date: ${header.date.split('-').reverse().join('/')}` : ''}</p>
                        </div>

                        <div className={cn(mbMed, "text-xs font-semibold text-slate-900", isLight ? "leading-loose" : (isMedium ? "leading-relaxed" : "leading-tight"))}>
                          To,<br />
                          {header.client}<br />
                          {header.division_display}<br />
                          {header.department}<br />
                          {header.address}
                        </div>

                        <div className={`${mbSmall} text-[11px] font-bold uppercase text-slate-900`}>Sub: {header.subject}</div>

                        <div className={`${mbMed} text-xs text-slate-800 ${mtMed}`}>
                          <p>Respected Sir,</p>
                          <p className={`${isLight ? 'mt-1.5' : 'mt-0.5'} font-medium`}>With due regards, please find below the quotation for your perusal:</p>
                        </div>

                        <table className={`w-full border-collapse border border-slate-900 text-[11px] ${mbMed}`}>
                          <thead className="bg-slate-100 font-bold uppercase">
                            <tr>
                              <th className={`border border-slate-900 ${headPadding} w-14 text-center`}>SN</th>
                              <th className={`border border-slate-900 ${headPadding} px-2 text-left`}>Particulars</th>
                              {quoteMode === 'LUMPSUM' || quoteMode === 'PERCENTAGE' ? (
                                <>
                                  <th className={`border border-slate-900 ${headPadding} w-20 text-center`}>Unit</th>
                                  <th className={`border border-slate-900 ${headPadding} px-2 w-28 text-right`}>Amount</th>
                                </>
                              ) : (
                                <>
                                  <th className={`border border-slate-900 ${headPadding} w-20 text-center`}>Rate</th>
                                  <th className={`border border-slate-900 ${headPadding} w-16 text-center`}>Unit</th>
                                  <th className={`border border-slate-900 ${headPadding} w-14 text-center`}>Qty</th>
                                  <th className={`border border-slate-900 ${headPadding} px-2 w-24 text-right`}>Amount</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {sortedRows.map((item, index) => {
                              const snStr = (item.sn || '').toString();
                              const isSubItem = snStr.includes('.');

                              const formatVal = (val: string | number) => {
                                const num = parseFloat(String(val));
                                if (isNaN(num) || num === 0) return "-";
                                return num.toLocaleString('en-IN');
                              };

                              return (
                                <tr key={index}>
                                  <td className={`border border-slate-900 ${cellPadding} text-center align-top font-medium`}>{snStr || "-"}</td>
                                  <td className={`border border-slate-900 ${cellPadding} px-2 align-top whitespace-pre-wrap ${isLight ? 'leading-relaxed' : 'leading-tight'} ${isSubItem ? "pl-6" : "font-bold"}`}>
                                    {item.particular || "-"}
                                  </td>
                                  {quoteMode === 'LUMPSUM' || quoteMode === 'PERCENTAGE' ? (
                                    <>
                                      <td className={`border border-slate-900 ${cellPadding} text-center align-top`}>{item.unit || "-"}</td>
                                      <td className={`border border-slate-900 ${cellPadding} px-2 text-right align-top font-bold`}>
                                        {quoteMode === 'PERCENTAGE' ? (item.amount || "-") : (Number(item.amount) > 0 ? Number(item.amount).toLocaleString('en-IN') : "-")}
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className={`border border-slate-900 ${cellPadding} text-center align-top`}>{formatVal(item.rate)}</td>
                                      <td className={`border border-slate-900 ${cellPadding} text-center align-top`}>{item.unit || "-"}</td>
                                      <td className={`border border-slate-900 ${cellPadding} text-center align-top`}>{formatVal(item.qty)}</td>
                                      <td className={`border border-slate-900 ${cellPadding} px-2 text-right align-top font-bold`}>
                                        {Number(item.amount) > 0 ? Number(item.amount).toLocaleString('en-IN') : "-"}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                            <tr className="bg-slate-50 font-bold text-slate-900">
                              <td colSpan={quoteMode === 'LUMPSUM' || quoteMode === 'PERCENTAGE' ? 3 : 5} className="border border-slate-900 py-1.5 px-2 text-right uppercase text-[9px] tracking-wider">Total Quoted Amount:</td>
                              <td className="border border-slate-900 py-1.5 px-2 text-right">{displayTotal}</td>
                            </tr>
                          </tbody>
                        </table>

                        <div className={`${mbSmall} text-[10px] font-bold text-slate-800 italic uppercase`}>
                          Amount in words: {quoteMode === 'PERCENTAGE' ? displayTotal : numberToWordsIndian(numericTotal)}
                        </div>

                        <div className={`${mbMed} flex items-start gap-1`}>
                          <span className="text-[9px] font-bold underline italic text-slate-600 shrink-0">Note:</span>
                          <ol className="text-[9px] font-bold italic text-slate-600 list-decimal pl-3 m-0 space-y-0.5">
                            {notes.map((note, idx) => (
                              note.trim() && <li key={idx} className="underline">{note}</li>
                            ))}
                            {showTerms && (
                              <li className="underline">Conditions Attached.</li>
                            )}
                          </ol>
                        </div>

                        <div className={cn("mt-auto break-inside-avoid shrink-0", footerGap)}>
                          <div className="flex justify-end pr-4">
                            <div className="text-left flex flex-col items-start border-l-2 border-blue-100 pl-4">
                              <p className="text-[10px] font-medium italic text-slate-500 mb-1">
                                {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? 'Sincerely,' : 'Yours sincerely,'}
                              </p>
                              <p className="font-black text-[12px] uppercase tracking-widest text-[#1a3f85] mb-2">
                                For {header.firm}
                              </p>
                              <p className="font-bold text-[12px] text-slate-900 tracking-tight">
                                {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? 'Er. Ajay Kumar Singh' : 'Er. Naveen Kumar'}
                              </p>
                              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-0.5">
                                {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? 'Executive Director' : 'Assistant Director (Consultancy)'}
                              </p>
                            </div>
                          </div>

                          <div className="text-center pb-2">
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-50 rounded-full text-[7px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100 shadow-sm">
                              <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              This is a computer generated quote and does not require a physical signature
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="absolute bottom-4 left-0 right-0 px-10">
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-[7.5px] text-slate-400 font-medium tracking-wide">
                    <p>IT Applications by: <span className="font-bold text-slate-600">Aetroniq Digital & Automation Services</span></p>
                    <p>Powered by <span className="font-black text-slate-800">URBANBUILD™</span></p>
                  </div>
                </div>
              </div>

              {showTerms && (
                <div className="bg-white shadow-2xl flex flex-col relative print:shadow-none print:break-before-page" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
                  <div className="flex justify-between items-center border-b-[3px] border-[#1a3f85] pb-4 mb-6">
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
                  </div>

                  <div className="border-b-2 border-blue-800 pb-2 mb-8">
                    <h2 className="text-xl font-black text-blue-900 uppercase">Terms & Conditions</h2>
                  </div>

                  <div className="space-y-8 text-sm text-slate-800 leading-relaxed">
                    <section>
                      <h3 className="font-bold text-blue-800 border-b border-blue-100 mb-3 pb-1">1. Payment Schedule</h3>
                      <p className="mb-2">The professional fees shall be payable by the Client as per the following stages:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        {termsData.stages.map((stage, i) => (
                          <li key={i} className="font-medium px-2 py-1 bg-blue-50/50 rounded">
                            <span className="font-bold text-blue-700">{stage.percentage}</span> {stage.label}
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-bold text-blue-800 border-b border-blue-100 mb-3 pb-1">2. General Conditions</h3>
                      <ul className="list-disc pl-6 space-y-3">
                        <li>All government fees, statutory charges, approval fees, taxes, or levies, if applicable, shall be borne and paid by the Client and are not included in this quotation.</li>
                        <li>All payments made shall be non-refundable once the work has commenced.</li>
                        <li>This quotation shall remain valid for one (01) month from the date of issue unless modified in writing.</li>
                      </ul>
                    </section>

                    <section className="bg-slate-50 border border-slate-200 p-6 rounded-xl mt-8">
                      <h3 className="font-bold text-blue-900 uppercase tracking-wider mb-4 border-b border-slate-300 pb-2 flex items-center gap-2">
                        <span className="bg-blue-800 text-white p-1 rounded text-[10px]">FIX</span> Account Details
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Bank Name</p>
                          <p className="font-black text-slate-900">Indian Overseas Bank</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Branch</p>
                          <p className="font-black text-slate-900 text-xs text-wrap">
                            {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? 'Sahastradhara Road, Dehradun' : 'Vasanth Vihar'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Account No</p>
                          <p className="font-black text-blue-800 text-lg tracking-wider">
                            {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? '386 902 000 000 099' : '055 202 000 00 1619'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">IFSC No</p>
                          <p className="font-black text-blue-800 text-lg tracking-wider">
                            {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? 'IOBA0003869' : 'IOBA0000552'}
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="mt-auto pt-10">
                    <div className="flex justify-end pr-4 mb-2">
                      <div className="text-left flex flex-col items-start border-l-2 border-blue-100 pl-4">
                        <p className="text-[10px] font-medium italic text-slate-500 mb-1">
                          {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? 'Sincerely,' : 'Yours sincerely,'}
                        </p>
                        <p className="font-black text-[12px] uppercase tracking-widest text-[#1a3f85] mb-2">
                          For {header.firm}
                        </p>
                        <p className="font-bold text-[12px] text-slate-900 tracking-tight">
                          {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? 'Er. Ajay Kumar Singh' : 'Er. Naveen Kumar'}
                        </p>
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-0.5">
                          {header.firm === 'URBANBUILD™ Pvt. Ltd.' ? 'Executive Director' : 'Assistant Director (Consultancy)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-0 right-0 px-10">
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-[7.5px] text-slate-400 font-medium tracking-wide">
                      <p>IT Applications by: <span className="font-bold text-slate-600">Aetroniq Digital & Automation Services</span></p>
                      <p>Powered by <span className="font-black text-slate-800">URBANBUILD™</span></p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}



