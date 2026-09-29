-- ============================================================
-- Migration: Create forwarding_letters and invoices tables & RLS policies
-- ============================================================

-- 1. FORWARDING LETTERS TABLE
CREATE TABLE IF NOT EXISTS public.forwarding_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  work_id UUID REFERENCES public.works(id) ON DELETE SET NULL,
  ubqn TEXT,
  firm TEXT,
  subsidiary TEXT,
  ub_section TEXT,
  sub_category TEXT,
  doc_type TEXT,
  letter_number TEXT,
  date DATE,
  recipient_title TEXT,
  recipient_division TEXT,
  recipient_department TEXT,
  recipient_address TEXT,
  subject TEXT,
  body_text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.forwarding_letters ADD COLUMN IF NOT EXISTS work_id UUID REFERENCES public.works(id) ON DELETE SET NULL;

-- 2. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  work_id UUID REFERENCES public.works(id) ON DELETE SET NULL,
  ubqn TEXT,
  firm TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  reference TEXT,
  reference_date DATE,
  state TEXT,
  bill_to_name TEXT,
  bill_to_address TEXT,
  bill_to_gstin TEXT,
  bill_to_state TEXT,
  ship_to_enabled BOOLEAN DEFAULT false,
  ship_to_name TEXT,
  ship_to_address TEXT,
  ship_to_gstin TEXT,
  ship_to_state TEXT,
  gst_type TEXT,
  gst_rate NUMERIC,
  items JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS work_id UUID REFERENCES public.works(id) ON DELETE SET NULL;

-- 3. ENABLE RLS
ALTER TABLE public.forwarding_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR FORWARDING LETTERS
DROP POLICY IF EXISTS "Allow all access to forwarding_letters" ON public.forwarding_letters;
CREATE POLICY "Allow all access to forwarding_letters" ON public.forwarding_letters
  FOR ALL USING (true) WITH CHECK (true);

-- 5. RLS POLICIES FOR INVOICES
DROP POLICY IF EXISTS "Allow all access to invoices" ON public.invoices;
CREATE POLICY "Allow all access to invoices" ON public.invoices
  FOR ALL USING (true) WITH CHECK (true);

-- 6. TRIGGERS FOR updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_forwarding_letters_updated_at') THEN
    CREATE TRIGGER update_forwarding_letters_updated_at BEFORE UPDATE ON public.forwarding_letters
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
    CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
