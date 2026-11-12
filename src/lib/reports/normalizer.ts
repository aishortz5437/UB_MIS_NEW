import type { Work } from '@/types/database';
import { formatDisplayUbqn, getWorkTotalCost, parseEstablishedUbqn } from '@/lib/utils';
import type { NormalizedWorkReport, ReportField } from './types';
import {
  ARCH_R1_CONCERN_ITEM,
  ARCH_R1_REPORT_CHECKLIST_MAPPING,
  CHECKLIST_REPORT_MAPPING,
  ROAD_REPORT_CHECKLIST_MAPPING,
} from './checklistMapping';

function formatAsBullets(text: string): string {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(lvl => lvl && lvl !== '•' && lvl !== '-')
    .map(line => (/^[•\-*]/.test(line) ? line.replace(/^[-*]\s*/, '• ') : `• ${line}`))
    .join('\n');
}

function buildCombinedRemarks(work: Work): string | null {
  const parts: string[] = [];

  const techRemarksText =
    (typeof work.metadata?.checklist_remark_Technical === 'string' && work.metadata.checklist_remark_Technical.trim()) ||
    (typeof work.checklist?.[991]?.remark === 'string' && work.checklist[991].remark.trim()) ||
    '';
  if (techRemarksText) parts.push(techRemarksText);

  const adminRemarksText =
    (typeof work.metadata?.checklist_remark_Administrative === 'string' && work.metadata.checklist_remark_Administrative.trim()) ||
    (typeof work.checklist?.[992]?.remark === 'string' && work.checklist[992].remark.trim()) ||
    '';
  if (adminRemarksText) parts.push(`Admin: ${adminRemarksText}`);

  const techList = work.metadata?.technical_remarks;
  if (Array.isArray(techList) && techList.length > 0) {
    const formattedList = (techList as Array<{ created_at?: string; author_name?: string; text?: string }>)
      .filter((r) => r && typeof r.text === 'string' && r.text.trim())
      .map((r) => {
        const dateStr = r.created_at ? new Date(r.created_at).toLocaleString() : '';
        const authorStr = r.author_name ? ` (${r.author_name})` : '';
        return `• ${dateStr}${authorStr} ${r.text!.trim()}`.trim();
      });
    if (formattedList.length > 0) parts.push(formattedList.join('\n'));
  }

  const metaRemark = typeof work.metadata?.remark === 'string' ? work.metadata.remark.trim() : '';
  if (metaRemark && !parts.includes(metaRemark)) parts.push(metaRemark);

  const summaryRemark = typeof work.remarks_summary === 'string' ? work.remarks_summary.trim() : '';
  if (summaryRemark && !parts.includes(summaryRemark)) parts.push(summaryRemark);

  if (work.checklist) {
    Object.entries(work.checklist).forEach(([idStr, item]) => {
      const id = Number(idStr);
      if ([21, 22, 23, 991, 992].includes(id)) return;
      const issue = typeof item?.issue === 'string' ? item.issue.trim() : '';
      if (issue) parts.push(`Issue: ${issue}`);
      const itemRemark = typeof item?.remark === 'string' ? item.remark.trim() : '';
      if (itemRemark) parts.push(itemRemark);
    });
  }

  const combined = formatAsBullets(parts.join('\n'));
  return combined || null;
}

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
  const ubqnSector = parseEstablishedUbqn(work.ubqn).sector;

  if (sub === 'Road' || sub === 'Bridge') return sub;
  if (sub === 'Arch' || divCode === 'BTP' || divCode === 'ARCH' || divName.includes("Building") || divName.includes("Architecture") || ubqnSector === 'ARCH') return 'Arch';
  if (sub === 'Ens' || divCode === 'EnS' || divName.includes("Environment") || divName.includes("Sustainability") || ubqnSector === 'ENS') return 'Ens';
  if (sub === 'WRE' || divCode.toUpperCase() === 'WRE' || divName.includes("Water Resource") || ubqnSector === 'WRE') return 'WRE';
  
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
    return { status: "DONE", source: `ID: ${itemId}`, rawValue: item };
  } else if (item.status === 'run') {
    return { status: "RUNNING", source: `ID: ${itemId}`, rawValue: item };
  } else if (item.status === 'na') {
    return { status: "NOT_APPLICABLE", source: `ID: ${itemId}`, rawValue: item };
  } else {
    return { status: "NOT_FILLED", source: `ID: ${itemId}`, rawValue: item };
  }
}

export function normalizeWork(work: Work): NormalizedWorkReport {
  const { span: regexSpan, lane: regexLane } = extractSpanAndLane(work.work_name);
  const type = getWorkType(work);
  const typeMappings = CHECKLIST_REPORT_MAPPING[type] || CHECKLIST_REPORT_MAPPING['Road'];

  const r1r2 = (work.status === 'Running R1' || work.status === 'Running R2') 
    ? (work.status.replace('Running ', '') as 'R1' | 'R2') 
    : null;
    
  const checklistSpan = type !== 'Arch' ? work.checklist?.[21]?.remark?.trim() : undefined;
  const checklistLane = work.checklist?.[22]?.remark?.trim();
  const concernAeJe =
    work.checklist?.[ARCH_R1_CONCERN_ITEM.id]?.remark?.trim() ||
    (typeof work.metadata?.concern_ae_je === 'string' ? work.metadata.concern_ae_je.trim() : '') ||
    null;
  const combinedRemarks = buildCombinedRemarks(work);
  const totalCostVal = getWorkTotalCost(work);

  const normalizeArchField = (fieldKey: keyof typeof ARCH_R1_REPORT_CHECKLIST_MAPPING, fallbackKey: keyof typeof CHECKLIST_REPORT_MAPPING['Road']) => (
    type === 'Arch'
      ? normalizeChecklistItem(work.checklist, ARCH_R1_REPORT_CHECKLIST_MAPPING[fieldKey].id)
      : normalizeChecklistField(work.checklist, typeMappings, fallbackKey)
  );

  return {
    work: {
      id: work.id,
      ubqn: formatDisplayUbqn(work.ubqn) || work.ubqn || "",
      name: work.work_name || "",
      orderNo: work.order_no || "",
      type,
      division: work.client_name || work.division?.name || "",
      client: work.client_name || work.division?.name || "",
      status: work.status,
      r1r2,
      archRemark: combinedRemarks,
      span: checklistSpan || regexSpan,
      lane: checklistLane || regexLane,
      remark: combinedRemarks,
      remarks: combinedRemarks,
      concernAeJe,
      total_cost: totalCostVal || null,
      consultancy_cost: totalCostVal || work.consultancy_cost || null,
    },
    checklist: {
      quotationNotice: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.quotationNotice.id) : { status: "UNAVAILABLE" },
      quotation: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.quotation.id) : { status: "UNAVAILABLE" },
      quotationAcceptance: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.quotationAcceptance.id) : { status: "UNAVAILABLE" },
      workOrderMou: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.workOrderMou.id) : { status: "UNAVAILABLE" },
      siteData: normalizeArchField('siteData', 'siteData'),
      survey: normalizeArchField('survey', 'survey'),
      siteTesting: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.siteTesting.id) : { status: "UNAVAILABLE" },
      lSection: type === 'Road' ? normalizeChecklistItem(work.checklist, work.checklist?.[4] ? 4 : 9) : { status: "UNAVAILABLE" },
      plan: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.plan.id) : { status: "UNAVAILABLE" },
      geology: normalizeArchField('geology', 'geology'),
      geologyHydrology: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.geologyHydrology.id) : { status: "UNAVAILABLE" },
      alignmentReport: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.alignmentReport.id) : { status: "UNAVAILABLE" },
      crustDesign: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.crustDesign.id) : { status: "UNAVAILABLE" },
      necessaryDrawings: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.necessaryDrawings.id) : { status: "UNAVAILABLE" },
      geotech: normalizeArchField('geotechReport', 'geotech'),
      hydrology: normalizeChecklistField(work.checklist, typeMappings, 'hydrology'),
      gad: normalizeChecklistField(work.checklist, typeMappings, 'gad'),
      ppr: normalizeChecklistField(work.checklist, typeMappings, 'ppr'),
      superstructure: normalizeChecklistField(work.checklist, typeMappings, 'superstructure'),
      substructure: normalizeChecklistField(work.checklist, typeMappings, 'substructure'),
      bbs: { status: "UNAVAILABLE" },
      vetting: normalizeArchField('vetting', 'vetting'),
      estimate: normalizeArchField('costEstimation', 'estimate'),
      formatting: normalizeArchField('dprFormatting', 'formatting'),
      dpr: normalizeArchField('dprPrinting', 'dpr'),
      forwardingInvoice: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.forwardingInvoice.id) : { status: "UNAVAILABLE" },
      observations: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.observations.id) : { status: "UNAVAILABLE" },
      submission: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.submission.id) : { status: "UNAVAILABLE" },
      billPaymentReceived: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.billPaymentReceived.id) : { status: "UNAVAILABLE" },
      voucher: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.voucher.id) : { status: "UNAVAILABLE" },
      experienceCertificate: type === 'Road' ? normalizeChecklistItem(work.checklist, ROAD_REPORT_CHECKLIST_MAPPING.experienceCertificate.id) : { status: "UNAVAILABLE" },
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
