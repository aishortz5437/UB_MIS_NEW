-- Create transactions table for payment history
CREATE TABLE public.third_party_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id UUID NOT NULL REFERENCES public.third_party_works(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 4),
  stage_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'GPay', 'Bank Transfer', 'Cheque')),
  transaction_ref TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.third_party_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can view transactions"
  ON public.third_party_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert transactions"
  ON public.third_party_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions"
  ON public.third_party_transactions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete transactions"
  ON public.third_party_transactions
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert mock transaction for existing work
INSERT INTO public.third_party_transactions (work_id, stage_number, stage_name, amount, payment_date, payment_mode, transaction_ref, remarks)
SELECT id, 1, 'Mobilisation', 2500, '2024-01-10'::date, 'GPay', 'GP-882910', 'Initial advance payment'
FROM public.third_party_works
WHERE work_name = 'Topographical Survey of GMVN'
LIMIT 1;