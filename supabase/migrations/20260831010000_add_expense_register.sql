-- Add settlement status to travel_requisitions
ALTER TABLE public.travel_requisitions 
ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'Not Submitted';

-- Create travel_expenses table
CREATE TABLE IF NOT EXISTS public.travel_expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    requisition_id UUID NOT NULL REFERENCES public.travel_requisitions(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_expenses ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_travel_expenses_updated_at BEFORE UPDATE ON public.travel_expenses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for travel_expenses
-- Employees can view their own expenses, admins/directors can view all
CREATE POLICY "Users can view own expenses or admins can view all" ON public.travel_expenses
    FOR SELECT USING (
        auth.uid() = employee_id OR 
        public.has_role(auth.uid(), 'Director'::text) OR 
        public.has_role(auth.uid(), 'Assistant Director'::text)
    );

-- Employees can insert their own expenses
CREATE POLICY "Users can insert own expenses" ON public.travel_expenses
    FOR INSERT WITH CHECK (auth.uid() = employee_id);

-- Employees can update their own expenses
CREATE POLICY "Users can update own pending expenses" ON public.travel_expenses
    FOR UPDATE USING (auth.uid() = employee_id);

-- Employees can delete their own expenses
CREATE POLICY "Users can delete own pending expenses" ON public.travel_expenses
    FOR DELETE USING (auth.uid() = employee_id);
