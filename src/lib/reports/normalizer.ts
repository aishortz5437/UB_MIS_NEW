import type { Work } from '@/types/database';
import type { NormalizedWorkReport, ReportField, ReportFieldStatus } from './types';
import {
  ARCH_R1_CONCERN_ITEM,
  ARCH_R1_REPORT_CHECKLIST_MAPPING,
  CHECKLIST_REPORT_MAPPING,
} from './checklistMapping';

function extractSpanAndLane(workName: string) {
  if (!workName) return { span: null, lane: null };
  const lowerName = workName.toLowerCase();
  
  let span: string | null = null;
  const spanMatch = lowerName.match(/(\d+(?:\.\d+)?)\s*(?:m|mtr|metre|meter)\s*(?:span)?/);
  if (spanMatch) {
    span = spanMatch[1];
  }

  let lane: string | null = null;
  const laneMatch = lowerName.match(/(?:(?:(\d+(?:\.\d+)?)\s*lane)|(?:(double|single)\s*lane))/);
  if (laneMatch) {
    lane = laneMatch[1] ? `${laneMatch[1]} Lane` : `${laneMatch[2] === 'double' ? '2' : '1'} Lane`;
  }

  return { span, lane };
}

function getWorkType(work: Work): string {
  const sub = work.subcategory;
  const divCode = work.division?.code || "";
  const divName = work.division?.name || "";

  if (sub === 'Road' || sub === 'Bridge') return sub;
  if (sub === 'Arch' || divCode === 'BTP' || divCode === 'ARCH' || divName.includes("Building") || divName.includes("Architecture")) return 'Arch';
  if (sub === 'Ens' || divCode === 'EnS' || divName.includes("Environment") || divName.includes("Sustainability")) return 'Ens';
  if (sub === 'WRE' || divCode.toUpperCase() === 'WRE' || divName.includes("Water Resource")) return 'WRE';
  
  return 'Road'; // Default fallback
}

function normalizeChecklistField(
  checklist: Work['checklist'],
  typeMappings: Record<string, number | null> | undefined,
  fieldKey: keyof typeof CHECKLIST_REPORT_MAPPING['Road']
): ReportField {
  if (!typeMappings || typeMappings[fieldKey] === null) {
    return { status: "NOT_APPLICABLE" };
  }

  const itemId = typeMappings[fieldKey];
  if (itemId === null || itemId === undefined) {
    return { status: "MAPPING_ERROR" };
  }

  return normalizeChecklistItem(checklist, itemId);
}

function normalizeChecklistItem(checklist: Work['checklist'], itemId: number): ReportField {
  if (!checklist || !checklist[itemId]) {
    return { status: "NOT_FILLED", source: `ID: ${itemId}` };
  }

  const item = checklist[itemId];
  if (item.status === 'checked') {
    return { status: "COMPLETED", source: `ID: ${itemId}`, rawValue: item };
  } else if (item.status === 'na') {
    return { status: "NOT_APPLICABLE", source: `ID: ${itemId}`, rawValue: item };
  } else {
    return { status: "PENDING", source: `ID: ${itemId}`, rawValue: item };
  }
}

export function normalizeWork(work: Work): NormalizedWorkReport {
  const { span: regexSpan, lane: regexLane } = extractSpanAndLane(work.work_name);
  const type = getWorkType(work);
  const typeMappings = CHECKLIST_REPORT_MAPPING[type] || CHECKLIST_REPORT_MAPPING['Road'];

  const r1r2 = (work.status === 'Running R1' || work.status === 'Running R2') 
    ? (work.status.replace('Running ', '') as 'R1' | 'R2') 
    : null;
    
  const checklistSpan = work.checklist?.[21]?.remark;
  const checklistLane = work.checklist?.[22]?.remark;
  const concernAeJe = work.checklist?.[ARCH_R1_CONCERN_ITEM.id]?.remark || null;
  const normalizeArchField = (fieldKey: keyof typeof ARCH_R1_REPORT_CHECKLIST_MAPPING, fallbackKey: keyof typeof CHECKLIST_REPORT_MAPPING['Road']) => (
    type === 'Arch'
      ? normalizeChecklistItem(work.checklist, ARCH_R1_REPORT_CHECKLIST_MAPPING[fieldKey].id)
      : normalizeChecklistField(work.checklist, typeMappings, fallbackKey)
  );

  return {
    work: {
      id: work.id,
      ubqn: work.ubqn || "",
      name: work.work_name || "",
      orderNo: work.order_no || "",
      type,
      division: work.division?.name || "",
      client: work.client_name || work.division?.name || "",
      status: work.status,
      r1r2,
      archRemark: (() => {
        const tech = work.metadata?.technical_remarks;
        if (Array.isArray(tech) && tech.length) {
          return (tech as Array<{ created_at: string; author_name?: string; text: string }>)
            .map((r) => `- ${new Date(r.created_at).toLocaleString()}${r.author_name ? ' ('+r.author_name+')' : ''} ${r.text}`)
            .join('\n');
        }
        return work.remarks_summary || null;
      })(),
      span: checklistSpan || regexSpan,
      lane: checklistLane || regexLane,
      remark: typeof work.metadata?.remark === 'string' ? work.metadata.remark : null,
      concernAeJe: concernAeJe,
      total_cost: ((work as Record<string, unknown>).total_cost as number | null) || null, // Not standard Work model, handled if joined
      consultancy_cost: work.consultancy_cost || null,
    },
    checklist: {
      survey: normalizeArchField('survey', 'survey'),
      geology: normalizeArchField('geology', 'geology'),
      geotech: normalizeArchField('geotechReport', 'geotech'),
      hydrology: normalizeChecklistField(work.checklist, typeMappings, 'hydrology'),
      gad: normalizeChecklistField(work.checklist, typeMappings, 'gad'),
      ppr: normalizeChecklistField(work.checklist, typeMappings, 'ppr'),
      superstructure: { status: "UNAVAILABLE" },
      substructure: { status: "UNAVAILABLE" },
      bbs: { status: "UNAVAILABLE" },
      vetting: normalizeArchField('vetting', 'vetting'),
      estimate: normalizeArchField('costEstimation', 'estimate'),
      formatting: normalizeArchField('dprFormatting', 'formatting'),
      dpr: normalizeArchField('dprPrinting', 'dpr'),
      siteLayout: type === 'Arch' ? normalizeChecklistItem(work.checklist, ARCH_R1_REPORT_CHECKLIST_MAPPING.siteLayout.id) : { status: "UNAVAILABLE" },
      conceptualPlan: type === 'Arch' ? normalizeChecklistItem(work.checklist, ARCH_R1_REPORT_CHECKLIST_MAPPING.conceptualPlan.id) : { status: "UNAVAILABLE" },
      ppt: type === 'Arch' ? normalizeChecklistItem(work.checklist, ARCH_R1_REPORT_CHECKLIST_MAPPING.ppt.id) : { status: "UNAVAILABLE" },
      threeD: type === 'Arch' ? normalizeChecklistItem(work.checklist, ARCH_R1_REPORT_CHECKLIST_MAPPING.threeD.id) : { status: "UNAVAILABLE" },
      architecturalDrawings: type === 'Arch' ? normalizeChecklistItem(work.checklist, ARCH_R1_REPORT_CHECKLIST_MAPPING.architecturalDrawings.id) : { status: "UNAVAILABLE" },
      structuralDrawings: type === 'Arch' ? normalizeChecklistItem(work.checklist, ARCH_R1_REPORT_CHECKLIST_MAPPING.structuralDrawings.id) : { status: "UNAVAILABLE" },
      deliveredForReview: type === 'Arch' ? normalizeChecklistItem(work.checklist, ARCH_R1_REPORT_CHECKLIST_MAPPING.deliveredForReview.id) : { status: "UNAVAILABLE" },
      finalDelivery: type === 'Arch' ? normalizeChecklistItem(work.checklist, ARCH_R1_REPORT_CHECKLIST_MAPPING.finalDelivery.id) : { status: "UNAVAILABLE" },
    },
    responsibility: {
      ae: { status: "UNAVAILABLE" },
      je: { status: "UNAVAILABLE" },
    }
  };
}
