-- Create function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Overload has_role to accept text to avoid enum casting issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  )
$$;

-- Create enums for the travel system
CREATE TYPE public.travel_requisition_status AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE public.ledger_transaction_type AS ENUM ('Advance', 'Expense');

-- Create travel_requisitions table
CREATE TABLE public.travel_requisitions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department TEXT,
    designation TEXT,
    division_project TEXT,
    travel_from TEXT NOT NULL,
    travel_to TEXT NOT NULL,
    purpose TEXT NOT NULL,
    duration TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    expense_transport DECIMAL(15, 2) DEFAULT 0,
    expense_local DECIMAL(15, 2) DEFAULT 0,
    expense_food DECIMAL(15, 2) DEFAULT 0,
    expense_driver DECIMAL(15, 2) DEFAULT 0,
    total_estimated DECIMAL(15, 2) NOT NULL DEFAULT 0,
    advance_required DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ad_status public.travel_requisition_status NOT NULL DEFAULT 'Pending',
    director_status public.travel_requisition_status NOT NULL DEFAULT 'Pending',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ledger_transactions table
CREATE TABLE public.ledger_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_type public.ledger_transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL, -- positive for advances (giving money), negative for expenses (using money)
    requisition_id UUID REFERENCES public.travel_requisitions(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_travel_requisitions_updated_at BEFORE UPDATE ON public.travel_requisitions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ledger_transactions_updated_at BEFORE UPDATE ON public.ledger_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for travel_requisitions
-- Employees can view their own requisitions, or users with role AD, Director, Admin can view all
CREATE POLICY "Users can view own requisitions or admins can view all" ON public.travel_requisitions
    FOR SELECT USING (
        auth.uid() = employee_id OR 
        public.has_role(auth.uid(), 'Director') OR 
        public.has_role(auth.uid(), 'Assistant Director')
    );

-- Employees can insert their own requisitions
CREATE POLICY "Users can insert own requisitions" ON public.travel_requisitions
    FOR INSERT WITH CHECK (auth.uid() = employee_id);

-- Employees can update their own pending requisitions, AD/Director can update status
CREATE POLICY "Users can update own pending requisitions or admins can update" ON public.travel_requisitions
    FOR UPDATE USING (
        (auth.uid() = employee_id AND ad_status = 'Pending') OR 
        public.has_role(auth.uid(), 'Director') OR 
        public.has_role(auth.uid(), 'Assistant Director')
    );

-- RLS Policies for ledger_transactions
-- Employees can view their own transactions, AD/Director can view all
CREATE POLICY "Users can view own ledger or admins can view all" ON public.ledger_transactions
    FOR SELECT USING (
        auth.uid() = employee_id OR 
        public.has_role(auth.uid(), 'Director') OR 
        public.has_role(auth.uid(), 'Assistant Director')
    );

-- Employees can insert expenses, Admins/Director can insert advances
CREATE POLICY "Users can insert ledger transactions" ON public.ledger_transactions
    FOR INSERT WITH CHECK (
        auth.uid() = employee_id OR 
        public.has_role(auth.uid(), 'Director') OR 
        public.has_role(auth.uid(), 'Assistant Director')
    );
