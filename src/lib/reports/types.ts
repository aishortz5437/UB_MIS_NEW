import type { Work, WorkStatus } from '@/types/database';

export type ReportFieldStatus =
  | "DONE"
  | "RUNNING"
  | "COMPLETED"
  | "PENDING"
  | "NOT_APPLICABLE"
  | "NOT_FILLED"
  | "UNAVAILABLE"
  | "MAPPING_ERROR";

export interface ReportField {
  status: ReportFieldStatus;
  source?: string;
  rawValue?: unknown;
}

export interface NormalizedWorkReport {
  work: {
    id: string;
    ubqn: string;
    name: string;
    orderNo: string;
    type: string; // "Road", "Bridge", etc.
    division: string;
    client: string;
    status: WorkStatus;
    r1r2: "R1" | "R2" | null;
    span: string | null;
    lane: string | null;
    remark: string | null;
    remarks: string | null;
    archRemark: string | null;
    concernAeJe: string | null;
    total_cost: number | null;
    consultancy_cost: number | null;
  };
  
  checklist: {
    quotationNotice: ReportField;
    quotation: ReportField;
    quotationAcceptance: ReportField;
    workOrderMou: ReportField;
    siteData: ReportField;
    survey: ReportField;
    siteTesting: ReportField;
    lSection: ReportField;
    plan: ReportField;
    geology: ReportField;
    geologyHydrology: ReportField;
    alignmentReport: ReportField;
    crustDesign: ReportField;
    necessaryDrawings: ReportField;
    geotech: ReportField;
    hydrology: ReportField;
    gad: ReportField;
    ppr: ReportField;
    superstructure: ReportField; // UNAVAILABLE
    substructure: ReportField; // UNAVAILABLE
    bbs: ReportField; // UNAVAILABLE
    vetting: ReportField;
    estimate: ReportField;
    formatting: ReportField;
    dpr: ReportField;
    forwardingInvoice: ReportField;
    observations: ReportField;
    submission: ReportField;
    billPaymentReceived: ReportField;
    voucher: ReportField;
    experienceCertificate: ReportField;
    siteLayout: ReportField;
    conceptualPlan: ReportField;
    ppt: ReportField;
    architecturalDrawings: ReportField;
    threeD: ReportField;
    structuralDrawings: ReportField;
    deliveredForReview: ReportField;
    finalDelivery: ReportField;
  };

  responsibility: {
    ae: ReportField; // UNAVAILABLE
    je: ReportField; // UNAVAILABLE
  };
}

export type ReportColumnKey = 
  | "sn"
  | "ubqn"
  | "name"
  | "orderNo"
  | "client"
  | "division"
  | "span"
  | "lane"
  | "quotationNotice"
  | "quotation"
  | "quotationAcceptance"
  | "workOrderMou"
  | "siteData"
  | "survey"
  | "siteTesting"
  | "lSection"
  | "plan"
  | "geology"
  | "geologyHydrology"
  | "alignmentReport"
  | "crustDesign"
  | "necessaryDrawings"
  | "geotech"
  | "hydrology"
  | "gad"
  | "ppr"
  | "superstructure"
  | "substructure"
  | "bbs"
  | "vetting"
  | "estimate"
  | "formatting"
  | "dpr"
  | "forwardingInvoice"
  | "observations"
  | "submission"
  | "billPaymentReceived"
  | "voucher"
  | "experienceCertificate"
  | "siteLayout"
  | "conceptualPlan"
  | "ppt"
  | "architecturalDrawings"
  | "threeD"
  | "structuralDrawings"
  | "deliveredForReview"
  | "finalDelivery"
  | "total_cost"
  | "consultancy_cost"
  | "remarks"
  | "archRemark"
  | "concernAeJe";

export interface ReportColumn {
  key: ReportColumnKey;
  header: string;
  superGroup?: string;
  group?: string;
  width?: number;
  visible: boolean;
  order: number;
}

export type SubcategoryFilter = "All" | "Road" | "Bridge" | "Arch" | "Ens" | "WRE";
export type StatusFilterOption = "All" | "Pipeline" | "Running R1" | "Running R2" | "Running R1 + R2" | "Completed C1" | "Completed C2" | "Completed C1*" | "Completed";

export interface ReportFilters {
  subcategory: SubcategoryFilter;
  status?: StatusFilterOption;
  statuses?: string[];
  search?: string;
}

