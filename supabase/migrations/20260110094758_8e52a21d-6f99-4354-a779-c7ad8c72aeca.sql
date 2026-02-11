
-- Create third_party_contractors table
CREATE TABLE public.third_party_contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ub_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  qualification TEXT,
  category TEXT NOT NULL DEFAULT 'Class A',
  aadhar_number TEXT,
  pan_number TEXT,
  age INTEGER,
  gender TEXT,
  mobile TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enum for payment stage status
CREATE TYPE public.payment_stage_status AS ENUM ('Locked', 'Due', 'Paid');

-- Create third_party_works table with 4-stage payment tracking
CREATE TABLE public.third_party_works (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES public.third_party_contractors(id) ON DELETE CASCADE,
  qt_no TEXT NOT NULL,
  work_name TEXT NOT NULL,
  client_name TEXT,
  quoted_amount NUMERIC NOT NULL DEFAULT 0,
  sanction_amount NUMERIC NOT NULL DEFAULT 0,
  stage_amount NUMERIC NOT NULL DEFAULT 0,
  stage1_status payment_stage_status NOT NULL DEFAULT 'Due',
  stage1_paid_at TIMESTAMP WITH TIME ZONE,
  stage2_status payment_stage_status NOT NULL DEFAULT 'Locked',
  stage2_paid_at TIMESTAMP WITH TIME ZONE,
  stage3_status payment_stage_status NOT NULL DEFAULT 'Locked',
  stage3_paid_at TIMESTAMP WITH TIME ZONE,
  stage4_status payment_stage_status NOT NULL DEFAULT 'Locked',
  stage4_paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.third_party_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.third_party_works ENABLE ROW LEVEL SECURITY;

-- RLS policies for contractors
CREATE POLICY "Authenticated users can view contractors"
ON public.third_party_contractors FOR SELECT TO authenticated
USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert contractors"
ON public.third_party_contractors FOR INSERT TO authenticated
WITH CHECK (is_authenticated_user());

CREATE POLICY "Authenticated users can update contractors"
ON public.third_party_contractors FOR UPDATE TO authenticated
USING (is_authenticated_user())
WITH CHECK (is_authenticated_user());

CREATE POLICY "Authenticated users can delete contractors"
ON public.third_party_contractors FOR DELETE TO authenticated
USING (is_authenticated_user());

-- RLS policies for works
CREATE POLICY "Authenticated users can view works"
ON public.third_party_works FOR SELECT TO authenticated
USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert works"
ON public.third_party_works FOR INSERT TO authenticated
WITH CHECK (is_authenticated_user());

CREATE POLICY "Authenticated users can update works"
ON public.third_party_works FOR UPDATE TO authenticated
USING (is_authenticated_user())
WITH CHECK (is_authenticated_user());

CREATE POLICY "Authenticated users can delete works"
ON public.third_party_works FOR DELETE TO authenticated
USING (is_authenticated_user());

-- Insert mock data
INSERT INTO public.third_party_contractors (ub_id, name, qualification, category, mobile, email)
VALUES ('UB-TP-001', 'Yuvraj Singh', 'B.Tech Civil', 'Class A', '9876543210', 'yuvraj@example.com');

-- Insert mock work with stage 1 paid, stage 2 due
INSERT INTO public.third_party_works (
  contractor_id, qt_no, work_name, client_name, quoted_amount, sanction_amount, stage_amount,
  stage1_status, stage1_paid_at, stage2_status
)
SELECT 
  id, 'QT-2024-001', 'Topographical Survey of GMVN', 'GMVN', 12000, 10000, 2500,
  'Paid', now(), 'Due'
FROM public.third_party_contractors WHERE ub_id = 'UB-TP-001';
