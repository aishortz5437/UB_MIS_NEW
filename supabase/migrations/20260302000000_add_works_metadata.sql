-- Add a flexible metadata JSONB column to store form-specific details
-- (tender details, hand receipt details, etc.)
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add address column since it's commonly needed across forms
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS address TEXT;
