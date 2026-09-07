export type TravelRequisitionStatus = 'Pending' | 'Approved' | 'Rejected';
export type LedgerTransactionType = 'Advance' | 'Expense';

export interface TravelRequisition {
    id: string;
    employee_id: string;
    department?: string;
    designation?: string;
    division_project?: string;
    travel_from: string;
    travel_to: string;
    purpose: string;
    duration?: string;
    start_date: string;
    end_date: string;
    expense_transport?: number;
    expense_local?: number;
    expense_food?: number;
    expense_driver?: number;
    expense_accommodation?: number;
    expense_misc?: number;
    total_estimated: number;
    advance_required: number;
    ad_status: TravelRequisitionStatus;
    director_status: TravelRequisitionStatus;
    settlement_status: string;
    remarks?: string;
    created_at: string;
    updated_at: string;
    profiles?: {
        full_name: string;
    };
}

export interface TravelExpense {
    id: string;
    requisition_id: string;
    employee_id: string;
    expense_date: string;
    category: string;
    amount: number;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface LedgerTransaction {
    id: string;
    employee_id: string;
    transaction_type: LedgerTransactionType;
    amount: number;
    requisition_id?: string;
    description?: string;
    created_at: string;
    updated_at: string;
}
