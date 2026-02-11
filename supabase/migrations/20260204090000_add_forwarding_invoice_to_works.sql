-- Add forwarding letter and invoice references for completed works
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS forwarding_letter TEXT;
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS invoice_no TEXT;
