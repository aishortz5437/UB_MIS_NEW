export type PaymentStageStatus = 'Locked' | 'Due' | 'Paid';
export type ContractorCategory = 'Class A' | 'Class B' | 'Class C';
export type PaymentMode = 'Cash' | 'GPay' | 'Bank Transfer' | 'Cheque';

export interface ThirdPartyContractor {
  id: string;
  ub_id: string;
  name: string;
  qualification: string | null;
  category: ContractorCategory;
  aadhar_number: string | null;
  pan_number: string | null;
  age: number | null;
  gender: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  works?: ThirdPartyWork[];
}

export interface ThirdPartyWork {
  id: string;
  contractor_id: string;
  qt_no: string;
  work_name: string;
  client_name: string | null;
  quoted_amount: number;
  sanction_amount: number;
  stage_amount: number;
  stage1_status: PaymentStageStatus;
  stage1_paid_at: string | null;
  stage2_status: PaymentStageStatus;
  stage2_paid_at: string | null;
  stage3_status: PaymentStageStatus;
  stage3_paid_at: string | null;
  stage4_status: PaymentStageStatus;
  stage4_paid_at: string | null;
  work_order_data: WorkOrderData | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderScopeItem {
  id: string;
  description: string;
  type_of_work: string;
  length_span: string;
  rate: string;
  amount: number;
}

export interface WorkOrderData {
  subject: string;
  date: string;
  to_address: string;
  project_details: {
    project: string;
    location: string;
  };
  completion_timeline: string[];
  terms_of_payment: string[];
  terms_and_conditions: string[];
  scope_of_work: WorkOrderScopeItem[];
}

export interface ThirdPartyTransaction {
  id: string;
  work_id: string;
  stage_number: number;
  stage_name: string;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode;
  transaction_ref: string | null;
  remarks: string | null;
  created_at: string;
}

export interface ContractorFormData {
  dob: string | number | readonly string[];
  ub_id: string;
  name: string;
  qualification: string;
  category: ContractorCategory;
  aadhar_number: string;
  pan_number: string;
  age: string;
  gender: string;
  mobile: string;
  email: string;
  address: string;
}

export interface WorkFormData {
  qt_no: string;
  work_name: string;
  client_name: string;
  quoted_amount: string;
  sanction_amount: string;
}

export interface PaymentFormData {
  payment_date: string;
  payment_mode: PaymentMode;
  transaction_ref: string;
  remarks: string;
}
