export type WorkStatus = 'Pipeline' | 'Running' | 'Completed';
export type WorkPriority = 'High' | 'Medium' | 'Low';
export type AppRole =
  | 'Director'
  | 'Assistant Director'
  | 'Admin'
  | 'Co-ordinator'
  | 'Employee';


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
  division?: Division;
  checklist?: Record<number, {
    status: 'checked' | 'na' | 'pending';
    remark?: string;
  }>;
  financial_data?: {
    status: 'Running Bill' | 'Final Bill';
    amount: number;
    deductions: {
      gst: number;
      it: number;
      lc: number;
      sd: number;
    };
  };
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
