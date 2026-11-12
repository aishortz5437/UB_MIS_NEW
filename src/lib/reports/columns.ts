import type { ReportColumn, ReportColumnKey } from './types';

export const DEFAULT_REPORT_COLUMNS: ReportColumn[] = [
  { key: "sn", header: "SN", width: 5, visible: true, order: 1 },
  { key: "ubqn", header: "UBQN", width: 10, visible: true, order: 2 },
  { key: "name", header: "Name of Work", width: 45, visible: true, order: 3 },
  { key: "client", header: "Client", width: 20, visible: true, order: 4 },
  { key: "consultancy_cost", header: "Consultancy Cost", width: 16, visible: true, order: 5 },
  { key: "span", header: "Span", width: 8, visible: true, order: 6 },
  { key: "lane", header: "Lane", width: 10, visible: true, order: 7 },
  
  { key: "survey", header: "Survey", superGroup: "PPR(Preliminary Project Report)", group: "Site Selection", width: 8, visible: true, order: 8 },
  { key: "geology", header: "Geology", superGroup: "PPR(Preliminary Project Report)", group: "Site Selection", width: 8, visible: true, order: 9 },
  { key: "geotech", header: "Geotech", superGroup: "PPR(Preliminary Project Report)", width: 10, visible: true, order: 10 },
  { key: "hydrology", header: "Hydrology", superGroup: "PPR(Preliminary Project Report)", width: 10, visible: true, order: 11 },
  { key: "gad", header: "GAD", superGroup: "PPR(Preliminary Project Report)", width: 8, visible: true, order: 12 },
  { key: "ppr", header: "PPR", superGroup: "PPR(Preliminary Project Report)", width: 8, visible: true, order: 13 },
  
  { key: "superstructure", header: "Super structure", superGroup: "Design & Drawing", width: 12, visible: true, order: 14 },
  { key: "substructure", header: "Sub-Structure", superGroup: "Design & Drawing", width: 12, visible: true, order: 15 },
  
  { key: "bbs", header: "BBS", width: 8, visible: false, order: 16 },
  { key: "vetting", header: "Vetting", width: 10, visible: true, order: 17 },
  { key: "estimate", header: "Estimate", width: 10, visible: true, order: 18 },
  
  { key: "formatting", header: "Formatting", width: 10, visible: true, order: 19 },
  { key: "dpr", header: "DPR", width: 8, visible: true, order: 20 },
  
  { key: "total_cost", header: "Total Cost", width: 15, visible: false, order: 21 },
  
  { key: "remarks", header: "Remark", width: 25, visible: true, order: 22 },
  { key: "concernAeJe", header: "Concern AE/JE", width: 20, visible: true, order: 23 },
];

export const ROAD_REPORT_COLUMNS: ReportColumn[] = [
  { key: "sn", header: "S.N", width: 6, visible: true, order: 1 },
  { key: "ubqn", header: "UBQN", width: 14, visible: true, order: 2 },
  { key: "division", header: "Division", width: 22, visible: true, order: 3 },
  { key: "orderNo", header: "Order no", width: 16, visible: true, order: 4 },
  { key: "name", header: "Name of Work", width: 42, visible: true, order: 5 },
  { key: "lane", header: "Lane", width: 10, visible: true, order: 6 },
  { key: "consultancy_cost", header: "Consultancy Cost", width: 16, visible: true, order: 7 },
  { key: "survey", header: "Survey", width: 12, visible: true, order: 8 },
  { key: "siteData", header: "Site Data / Photograph", width: 16, visible: true, order: 9 },
  { key: "siteTesting", header: "Site Testing (CBR/FWD/BBD/NSV)", width: 18, visible: true, order: 10 },
  { key: "lSection", header: "L - Section & Cross - Section / Geometric Design", width: 22, visible: true, order: 11 },
  { key: "plan", header: "Plan", width: 10, visible: true, order: 12 },
  { key: "geologyHydrology", header: "Geology & Hydrology", width: 16, visible: true, order: 13 },
  { key: "alignmentReport", header: "Alignment Report", width: 16, visible: true, order: 14 },
  { key: "crustDesign", header: "Crust / Overlay Design", width: 16, visible: true, order: 15 },
  { key: "necessaryDrawings", header: "Necessary Drawings", width: 16, visible: true, order: 16 },
  { key: "estimate", header: "Costing & Estimation", width: 16, visible: true, order: 17 },
  { key: "formatting", header: "Report/DPR Formatting", width: 16, visible: true, order: 18 },
  { key: "dpr", header: "Report/Drawing/DPR Printing", width: 18, visible: true, order: 19 },
  { key: "concernAeJe", header: "Concern AE/JE", width: 20, visible: true, order: 20 },
  { key: "remarks", header: "Remark", width: 28, visible: true, order: 21 },
];

export const ARCH_R1_REPORT_COLUMNS: ReportColumn[] = [
  { key: "sn", header: "S.N", width: 6, visible: true, order: 1 },
  { key: "ubqn", header: "UBQN", width: 14, visible: true, order: 2 },
  { key: "division", header: "Division", width: 22, visible: true, order: 3 },
  { key: "orderNo", header: "Order no", width: 16, visible: true, order: 4 },
  { key: "name", header: "Name of Work", width: 42, visible: true, order: 5 },
  { key: "consultancy_cost", header: "Consultancy Cost", width: 16, visible: true, order: 6 },
  { key: "survey", header: "Survey", width: 14, visible: true, order: 7 },
  { key: "siteLayout", header: "Site Layout", width: 14, visible: true, order: 8 },
  { key: "siteData", header: "Site data / photograph", width: 18, visible: true, order: 9 },
  { key: "conceptualPlan", header: "Conceptual planning", width: 18, visible: true, order: 10 },
  { key: "geotech", header: "Geotech report", width: 14, visible: true, order: 11 },
  { key: "geology", header: "Geology", width: 14, visible: true, order: 12 },
  { key: "architecturalDrawings", header: "Architectural drawings", width: 20, visible: true, order: 13 },
  { key: "threeD", header: "3D", width: 10, visible: true, order: 14 },
  { key: "structuralDrawings", header: "Structural drawings & DBR", width: 22, visible: true, order: 15 },
  { key: "vetting", header: "Vetting", width: 12, visible: true, order: 16 },
  { key: "estimate", header: "Cost estimation", width: 16, visible: true, order: 17 },
  { key: "formatting", header: "DPR Formatting", width: 14, visible: true, order: 18 },
  { key: "dpr", header: "DPR Printing", width: 14, visible: true, order: 19 },
  { key: "deliveredForReview", header: "Delivered For Review", width: 18, visible: true, order: 20 },
  { key: "finalDelivery", header: "Final Delivery", width: 14, visible: true, order: 21 },
  { key: "concernAeJe", header: "Concern AE/JE", width: 20, visible: true, order: 22 },
  { key: "archRemark", header: "Remark", width: 28, visible: true, order: 23 },
];

export function getVisibleColumns(columns: ReportColumn[]): ReportColumn[] {
  return columns
    .filter(column => column.visible)
    .sort((a, b) => a.order - b.order);
}

export function toggleColumnVisibility(columns: ReportColumn[], key: ReportColumnKey): ReportColumn[] {
  return columns.map(col => col.key === key ? { ...col, visible: !col.visible } : col);
}

export function setAllColumnsVisibility(columns: ReportColumn[], visible: boolean): ReportColumn[] {
  return columns.map(col => ({ ...col, visible }));
}
