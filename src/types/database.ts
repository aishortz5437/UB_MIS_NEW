export type WorkStatus = 'Pipeline' | 'Running' | 'Running R1' | 'Running R2' | 'Completed';
export type WorkPriority = 'High' | 'Medium' | 'Low';
export type AppRole =
  | 'Director'
  | 'Assistant Director'
  | 'Admin'
  | 'Co-ordinator'
  | 'Junior Engineer'
  | 'Pending';


export interface Division {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  division_id: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  division?: Division;
}

export interface Work {
  id: string;
  ubqn: string;
  division_id: string;
  work_name: string;
  client_name: string | null;
  consultancy_cost: number;
  status: WorkStatus;
  subcategory: string | null;
  order_no: string | null;
  order_date: string | null;
  forwarding_letter: string | null;
  invoice_no: string | null;
  created_at: string;
  updated_at: string;
  pending_r2_approval?: boolean;
  r2_approval_requested_by?: string | null;
  division?: Division;
  checklist?: Record<number, {
    status: 'checked' | 'na' | 'pending';
    remark?: string;
  }>;
  financial_data?: {
    status: 'Running Bill' | 'Final Bill';
    amount: number;
    date?: string;
    payments?: Array<{
      id: string;
      amount: number;
      date: string;
      deductions: {
        gst: number;
        it: number;
        lc: number;
        sd: number;
      };
    }>;
    deductions: {
      gst: number;
      it: number;
      lc: number;
      sd: number;
    };
  };
  address?: string | null;
  financial_date?: string | null;
  metadata?: Record<string, any>;
}

export interface OrgHierarchy {
  id: string;
  position_name: string;
  position_order: number;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}


export interface Task {
  id: string;
  work_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}


export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Quotation {
  id: string;
  created_at: string;
  ubqn: string;
  section: string;
  quotation_date: string;
  client_name: string | null;
  division_name?: string | null; // Added from first definition
  department_name?: string | null; // Added from first definition
  address?: string | null;       // Added from first definition
  subject: string | null;
  reference_no?: string | null;  // Added from first definition
  consultancy_cost: number | null;
  work_id?: string | null;       // Added from first definition
  version_no?: number | null;    // Added from first definition
  division_id: string | null;
  subcategory: string | null;    // This will now hold "Running" values
}

export interface Tender {
  id: string;
  created_at: string;
  updated_at: string;
  ubqn: string;
  division_id: string | null;
  work_id: string | null;
  work_name: string;
  department: string | null;
  sector: string | null;
  address: string | null;
  tender_id: string | null;
  tender_upload_last_date: string | null;
  tender_upload_last_time: string | null;
  tender_opening_date: string | null;
  tender_opening_time: string | null;
  emd_cost: number;
  consultancy_cost: number;
  validity_of_tender: string | null;
  completion_period: string | null;
  specific_condition: string | null;
}

export interface HandReceipt {
  id: string;
  created_at: string;
  updated_at: string;
  ubqn: string;
  division_id: string | null;
  work_id: string | null;
  work_name: string;
  department: string | null;
  sector: string | null;
  address: string | null;
  probable_cost: number;
  mode: 'Letter No' | 'Verbal' | null;
  letter_no: string | null;
}

export type NotificationType =
  | 'work_created'
  | 'work_updated'
  | 'tender_created'
  | 'hr_created'
  | 'r2_requested'
  | 'r2_approved'
  | 'r2_rejected'
  | 'checklist_updated'
  | 'financial_updated';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}
