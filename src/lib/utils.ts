import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Work, Division } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getWorkTotalCost = (work: Pick<Work, 'consultancy_cost' | 'metadata'>): number => {
  const baseCost = Number(work.consultancy_cost) || 0;
  const includeGst = work.metadata?.include_gst === true;
  return getGstInclusiveCost(baseCost, includeGst);
};

export const getWorkBaseCost = (work: Pick<Work, 'consultancy_cost' | 'metadata'>): number => {
  const metadataBaseCost = Number(work.metadata?.base_cost);
  if (work.metadata?.base_cost !== undefined && work.metadata.base_cost !== null && Number.isFinite(metadataBaseCost)) {
    return metadataBaseCost;
  }

  const amount = Number(work.consultancy_cost) || 0;
  const isLegacyGstInclusiveQuote =
    work.metadata?.type === 'Quotation' && work.metadata?.created_from_quote === true;
  return work.metadata?.include_gst === true || isLegacyGstInclusiveQuote
    ? Math.round((amount / 1.18) * 100) / 100
    : amount;
};

export const getGstInclusiveCost = (baseCost: number | null | undefined, includeGst: boolean): number => {
  const amount = Number(baseCost) || 0;
  return includeGst ? amount * 1.18 : amount;
};

/**
 * Generates an uppercase shorthand acronym from a department, division, or organization name.
 * e.g. "Public works Department" -> "PWD"
 *      "Provincial Division" -> "PD"
 *      "P.W.D." -> "PWD"
 *      "PD" -> "PD"
 */
export const getShorthand = (str: string): string => {
  if (!str || str.toLowerCase().includes("enter")) return "";

  const text = str.trim();
  const normalized = text.replace(/\./g, '');
  const rawParts = normalized.split(/\s+/).filter(Boolean);

  if (rawParts.length === 0) return "";

  const looksLikeAddress = /\d|,|\b(road|lane|street|roadway|near|opposite|colony|sector|ward|village|town|city|district|state|block|market|chowk|nagar|mohalla|campus|camp|r\/o)\b/i.test(normalized) || /[\/\\]/.test(normalized);

  if (looksLikeAddress) {
    return text;
  }

  if (rawParts.length === 1 && rawParts[0].length <= 5) {
    return rawParts[0].toUpperCase();
  }

  const ignore = new Set(['and', '&', 'of', 'the', 'in', 'for']);
  const filtered = rawParts.filter(w => !ignore.has(w.toLowerCase()));
  const parts = filtered.length > 0 ? filtered : rawParts;
  return parts
    .map(word => {
      const match = word.match(/[a-zA-Z0-9]/);
      return match ? match[0] : '';
    })
    .join('')
    .toUpperCase();
};

/**
 * Strips recognized category and document-type prefixes (e.g. "RnB-", "RnB (Q)-", "Arch-", "Ens-", "UBQN-")
 * from stored UBQN strings for UI display without blindly splitting on hyphens.
 * Preserves the exact stored value and casing of the underlying identifier.
 */
export const formatDisplayUbqn = (ubqn?: string | null): string => {
  if (!ubqn) return '';
  const trimmed = ubqn.trim();
  // Strip recognized category/section prefixes with optional doc-type indicators (e.g., "RnB-", "RnB (Q)-", "Arch (T)-", "WRE (Q)-")
  const stripped = trimmed.replace(/^(?:(?:RnB|Arch|Ar|Ens|BTP|WRE|UBQN)\s*(?:\([A-Za-z*]+\))?\s*-\s*)+/i, '');
  return stripped.trim();
};

/**
 * Regex matching established sector prefixes with optional doc-type indicators.
 * Matches e.g. "RnB (Q)- 445", "Arch (T)- 102", "Ar (H)- 50", "WRE (Q)- 10", "RnB- 445"
 */
const ESTABLISHED_SECTOR_REGEX = /^(RnB|Arch|Ar|Ens|BTP|WRE)\s*(?:\(([QTH])\))?\s*-\s*(.+)$/i;

export interface ParsedUbqn {
  core: string;
  sector?: string;
  docTypeChar?: string;
  docType?: 'Quotation' | 'Tender' | 'HR';
  isEstablished: boolean;
}

/**
 * Safely parses a stored UBQN identifier without using split('-').pop().
 * Distinguishes established sector/type and auto-generated "UBQN-" identifiers from
 * custom hyphenated identifiers, preserving meaningful hyphenated portions intact.
 */
export const parseEstablishedUbqn = (ubqn?: string | null): ParsedUbqn => {
  if (!ubqn) {
    return { core: '', isEstablished: false };
  }
  const trimmed = ubqn.trim();
  if (trimmed.toUpperCase().startsWith('UBQN')) {
    return {
      core: trimmed,
      isEstablished: true,
    };
  }

  const match = trimmed.match(ESTABLISHED_SECTOR_REGEX);
  if (match) {
    const rawSector = match[1];
    const normalizedSector = rawSector.toLowerCase() === 'ar'
      ? 'Arch'
      : rawSector.toLowerCase() === 'wre'
        ? 'WRE'
        : rawSector;
    const docTypeChar = match[2]?.toUpperCase();
    const docType = docTypeChar === 'T' ? 'Tender' : docTypeChar === 'H' ? 'HR' : docTypeChar === 'Q' ? 'Quotation' : undefined;
    const core = match[3].trim();
    return {
      core,
      sector: normalizedSector,
      docTypeChar,
      docType,
      isEstablished: true,
    };
  }

  // Custom / unknown identifier (preserves all hyphens and casing)
  return {
    core: trimmed,
    isEstablished: false,
  };
};

/**
 * Constructs the canonical full UBQN identifier to be sent to the database/RPC.
 * - Auto-generated "UBQN-" identifiers are kept as-is.
 * - Strings already containing an established prefix are normalized without duplicate prefixes.
 * - Custom hyphenated identifiers without established prefixes are preserved intact.
 * - Bare identifiers (e.g. numeric "445") are formatted with the selected sector and document type.
 */
export const buildCanonicalUbqn = (
  rawUbqn?: string | null,
  sector?: string | null,
  docType?: string | null
): string => {
  if (!rawUbqn) return '';
  const trimmed = rawUbqn.trim();
  if (!trimmed) return '';

  if (trimmed.toUpperCase().startsWith('UBQN')) {
    return trimmed;
  }

  const parsed = parseEstablishedUbqn(trimmed);
  if (parsed.isEstablished && parsed.sector) {
    const finalSector = parsed.sector;
    const typeChar = parsed.docTypeChar || (docType === 'Tender' ? 'T' : docType === 'HR' ? 'H' : 'Q');
    return `${finalSector} (${typeChar})- ${parsed.core}`;
  }

  // If it's a custom identifier containing hyphens and not an established sector,
  // preserve it as-is (do not blindly rebuild using currently selected section/docType)
  if (trimmed.includes('-')) {
    return trimmed;
  }

  // Bare identifier (e.g. "445"): format with sector and docType if available
  const sec = sector?.trim();
  const normalizedSector = sec === 'Ar' ? 'Arch' : sec;
  const typeChar = docType === 'Tender' ? 'T' : docType === 'HR' ? 'H' : 'Q';
  if (normalizedSector) {
    return `${normalizedSector} (${typeChar})- ${trimmed}`;
  }
  return trimmed;
};

/**
 * Checks whether a submitted UBQN input represents the same established or custom
 * identifier as the originally stored quotation UBQN, accounting for harmless
 * display-format differences without allowing arbitrary changes or conflating different custom identifiers.
 */
export const areUbqnsEquivalent = (
  submittedRaw: string | null | undefined,
  originalStored: string | null | undefined,
  context?: { ubSection?: string | null; docType?: string | null }
): boolean => {
  const orig = (originalStored || '').trim();
  const subm = (submittedRaw || '').trim();
  if (!orig && !subm) return true;
  if (!orig || !subm) return false;
  if (orig === subm) return true;

  // Auto-generated UBQN format comparison
  if (orig.toUpperCase().startsWith('UBQN') || subm.toUpperCase().startsWith('UBQN')) {
    return orig === subm;
  }

  const origParsed = parseEstablishedUbqn(orig);

  // If original was an established format, orig is the authoritative identity
  if (origParsed.isEstablished && origParsed.sector) {
    if (subm === orig) return true;

    // Check if user submitted an established canonical string
    const submParsed = parseEstablishedUbqn(subm);
    if (submParsed.isEstablished && submParsed.sector) {
      const sectorsMatch = origParsed.sector.toLowerCase() === submParsed.sector.toLowerCase();
      const coresMatch = origParsed.core === submParsed.core;
      if (!origParsed.docTypeChar) {
        return sectorsMatch && coresMatch;
      }
      const typesMatch = origParsed.docTypeChar === submParsed.docTypeChar;
      return sectorsMatch && coresMatch && typesMatch;
    }

    // Harmless display difference: user submitted bare core identifier (e.g. "445")
    // Use authoritative original stored sector and docType for comparison,
    // but verify that any editable context does not conflict with the authoritative identity.
    const activeSector = (context?.ubSection === 'Ar' ? 'Arch' : context?.ubSection)?.trim();
    if (activeSector && activeSector.toLowerCase() !== origParsed.sector.toLowerCase()) {
      return false;
    }

    const activeDocTypeChar = context?.docType === 'Tender' ? 'T' : context?.docType === 'HR' ? 'H' : 'Q';
    if (origParsed.docTypeChar && activeDocTypeChar !== origParsed.docTypeChar) {
      return false;
    }

    return subm === origParsed.core;
  }

  // For custom identifiers (e.g. "CUSTOM-ID-1"), strict equality is required
  return orig === subm;
};

/**
 * Ensures the Water Resource Engineering (WRE) division exists in the divisions list
 * and deduplicates divisions by normalized code/name (moving any duplicate DB rows in the background).
 */
let wreEnsurePromise: Promise<Division | null> | null = null;
let wreCleanupDone = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ensureWreDivision = async (divisions: Division[] | null | undefined, supabaseClient?: any): Promise<Division[]> => {
  const rawList = divisions ? [...divisions] : [];

  // Deduplicate divisions by normalized code (or name if code is missing)
  // Prefer the earliest created record as the canonical division
  const sortedList = [...rawList].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });

  const seenCodes = new Map<string, Division>();
  const duplicateWreIds: string[] = [];

  for (const d of sortedList) {
    const isWreRow = d.code?.toUpperCase() === 'WRE' || d.name?.toLowerCase().includes('water resource');
    const normKey = isWreRow
      ? 'WRE'
      : (d.code?.trim().toUpperCase() || d.name?.trim().toUpperCase() || d.id);

    if (!seenCodes.has(normKey)) {
      seenCodes.set(normKey, d);
    } else if (isWreRow && d.id && d.id !== 'wre-sector-fallback') {
      duplicateWreIds.push(d.id);
    }
  }

  // If duplicate WRE rows exist in the database, reassign any linked records to the canonical WRE ID and delete duplicates once
  const canonicalWre = seenCodes.get('WRE');
  if (supabaseClient && canonicalWre && canonicalWre.id !== 'wre-sector-fallback' && duplicateWreIds.length > 0 && !wreCleanupDone) {
    wreCleanupDone = true;
    (async () => {
      try {
        for (const dupId of duplicateWreIds) {
          await supabaseClient.from('works').update({ division_id: canonicalWre.id }).eq('division_id', dupId);
          await supabaseClient.from('quotations').update({ division_id: canonicalWre.id }).eq('division_id', dupId);
          await supabaseClient.from('tenders').update({ division_id: canonicalWre.id }).eq('division_id', dupId);
          await supabaseClient.from('hand_receipts').update({ division_id: canonicalWre.id }).eq('division_id', dupId);
          await supabaseClient.from('divisions').delete().eq('id', dupId);
        }
      } catch (e) {
        console.warn('Background WRE duplicate cleanup warning:', e);
      }
    })();
  }

  const dedupedList = Array.from(seenCodes.values());
  if (seenCodes.has('WRE')) {
    return dedupedList;
  }

  if (supabaseClient) {
    try {
      if (!wreEnsurePromise) {
        wreEnsurePromise = (async () => {
          const { data: existingRows } = await supabaseClient
            .from('divisions')
            .select('*')
            .ilike('code', 'WRE')
            .order('created_at', { ascending: true });

          if (Array.isArray(existingRows) && existingRows.length > 0) {
            return existingRows[0] as Division;
          }

          const { data: inserted, error } = await supabaseClient
            .from('divisions')
            .insert({
              name: 'Water Resource Engineering',
              code: 'WRE',
              description: 'Water resource engineering and management',
            })
            .select('*')
            .maybeSingle();

          if (!error && inserted) {
            return inserted as Division;
          }

          const { data: fallbackRows } = await supabaseClient
            .from('divisions')
            .select('*')
            .ilike('code', 'WRE')
            .limit(1);

          return Array.isArray(fallbackRows) && fallbackRows.length > 0 ? (fallbackRows[0] as Division) : null;
        })();
      }

      const resolvedWre = await wreEnsurePromise;
      if (resolvedWre) {
        return [...dedupedList, resolvedWre];
      }
    } catch {
      // Fallback below if RLS or network prevents immediate seeding
    } finally {
      wreEnsurePromise = null;
    }
  }

  return [
    ...dedupedList,
    {
      id: 'wre-sector-fallback',
      name: 'Water Resource Engineering',
      code: 'WRE',
      description: 'Water resource engineering and management',
      created_at: new Date().toISOString(),
    },
  ];
};

