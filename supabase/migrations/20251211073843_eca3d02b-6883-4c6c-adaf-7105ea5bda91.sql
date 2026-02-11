-- Add new columns to works table
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS qtn_no TEXT;

-- Update division names
UPDATE public.divisions SET name = 'Buildings & Town Planning' WHERE name = 'Architecture';
UPDATE public.divisions SET name = 'Environment & Sustainability' WHERE name = 'Engineering Services';