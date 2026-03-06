-- ============================================================
-- Migration: Create tenders and hand_receipts tables
-- Pattern: Same as quotations -> works sync flow
-- Each form saves full details to its own table, then
-- upserts a summary row into the works table.
-- ============================================================

-- 1. TENDERS TABLE
CREATE TABLE IF NOT EXISTS public.tenders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ubqn TEXT NOT NULL,
  division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  subcategory TEXT,
  work_id UUID REFERENCES public.works(id) ON DELETE SET NULL,
  work_name TEXT NOT NULL,
  department TEXT,
  sector TEXT,
  address TEXT,
  tender_id TEXT,
  tender_upload_last_date DATE,
  tender_upload_last_time TIME,
  tender_opening_date DATE,
  tender_opening_time TIME,
  emd_cost NUMERIC DEFAULT 0,
  consultancy_cost NUMERIC DEFAULT 0,
  validity_of_tender TEXT,
  completion_period TEXT,
  specific_condition TEXT,
  CONSTRAINT tenders_ubqn_unique UNIQUE (ubqn)
);

-- 2. HAND RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS public.hand_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ubqn TEXT NOT NULL,
  division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  subcategory TEXT,
  work_id UUID REFERENCES public.works(id) ON DELETE SET NULL,
  work_name TEXT NOT NULL,
  department TEXT,
  sector TEXT,
  address TEXT,
  probable_cost NUMERIC DEFAULT 0,
  mode TEXT,
  letter_no TEXT,
  CONSTRAINT hand_receipts_ubqn_unique UNIQUE (ubqn)
);

-- 3. ENABLE RLS
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hand_receipts ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES - Tenders
CREATE POLICY "Authenticated users can view tenders" ON public.tenders
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Authenticated users can insert tenders" ON public.tenders
  FOR INSERT WITH CHECK (public.is_authenticated_user());

CREATE POLICY "Authenticated users can update tenders" ON public.tenders
  FOR UPDATE USING (public.is_authenticated_user());

CREATE POLICY "Admins can delete tenders" ON public.tenders
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 5. RLS POLICIES - Hand Receipts
CREATE POLICY "Authenticated users can view hand_receipts" ON public.hand_receipts
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Authenticated users can insert hand_receipts" ON public.hand_receipts
  FOR INSERT WITH CHECK (public.is_authenticated_user());

CREATE POLICY "Authenticated users can update hand_receipts" ON public.hand_receipts
  FOR UPDATE USING (public.is_authenticated_user());

CREATE POLICY "Admins can delete hand_receipts" ON public.hand_receipts
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 6. TRIGGERS FOR updated_at
CREATE TRIGGER update_tenders_updated_at BEFORE UPDATE ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hand_receipts_updated_at BEFORE UPDATE ON public.hand_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_tenders_division_id ON public.tenders (division_id);
CREATE INDEX IF NOT EXISTS idx_tenders_created_at_desc ON public.tenders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenders_work_id ON public.tenders (work_id);

CREATE INDEX IF NOT EXISTS idx_hand_receipts_division_id ON public.hand_receipts (division_id);
CREATE INDEX IF NOT EXISTS idx_hand_receipts_created_at_desc ON public.hand_receipts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hand_receipts_work_id ON public.hand_receipts (work_id);

-- 8. GIN INDEX ON works.metadata for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_works_metadata ON public.works USING gin (metadata);
