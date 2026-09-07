import type { ReportColumn, ReportColumnKey } from './types';

export const DEFAULT_REPORT_COLUMNS: ReportColumn[] = [
  { key: "sn", header: "SN", width: 5, visible: true, order: 1 },
  { key: "ubqn", header: "UBQN", width: 10, visible: true, order: 2 },
  { key: "name", header: "Name of Work", width: 45, visible: true, order: 3 },
  { key: "client", header: "Client", width: 20, visible: true, order: 4 },
  { key: "span", header: "Span", width: 8, visible: true, order: 5 },
  { key: "lane", header: "Lane", width: 10, visible: true, order: 6 },
  
  { key: "survey", header: "Survey", superGroup: "PPR(Preliminary Project Report)", group: "Site Selection", width: 8, visible: true, order: 7 },
  { key: "geology", header: "Geology", superGroup: "PPR(Preliminary Project Report)", group: "Site Selection", width: 8, visible: true, order: 8 },
  { key: "geotech", header: "Geotech", superGroup: "PPR(Preliminary Project Report)", width: 10, visible: true, order: 9 },
  { key: "hydrology", header: "Hydrology", superGroup: "PPR(Preliminary Project Report)", width: 10, visible: true, order: 10 },
  { key: "gad", header: "GAD", superGroup: "PPR(Preliminary Project Report)", width: 8, visible: true, order: 11 },
  { key: "ppr", header: "PPR", superGroup: "PPR(Preliminary Project Report)", width: 8, visible: true, order: 12 },
  
  { key: "superstructure", header: "Super structure", superGroup: "Design & Drawing", width: 12, visible: true, order: 13 },
  { key: "substructure", header: "Sub-Structure", superGroup: "Design & Drawing", width: 12, visible: true, order: 14 },
  
  { key: "bbs", header: "BBS", width: 8, visible: false, order: 15 },
  { key: "vetting", header: "Vetting", width: 10, visible: true, order: 16 },
  { key: "estimate", header: "Estimate", width: 10, visible: true, order: 17 },
  
  { key: "formatting", header: "Formatting", width: 10, visible: true, order: 18 },
  { key: "dpr", header: "DPR", width: 8, visible: true, order: 19 },
  
  { key: "total_cost", header: "Total Cost", width: 15, visible: false, order: 20 },
  { key: "consultancy_cost", header: "Consultancy Cost", width: 15, visible: false, order: 21 },
  
  { key: "remarks", header: "Remark", width: 25, visible: true, order: 22 },
  { key: "concernAeJe", header: "Concern AE/JE", width: 20, visible: false, order: 23 },
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
