-- Align the live works table with the app's current quotation/work flow.
-- This makes the automatic work creation path valid in Supabase.

ALTER TABLE public.works ADD COLUMN IF NOT EXISTS ubqn TEXT;
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS sn_no TEXT;
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS firm TEXT;
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS work_name TEXT;
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

UPDATE public.works
SET ubqn = COALESCE(ubqn, 'UBQN-' || substr(md5(random()::text), 1, 12))
WHERE ubqn IS NULL;

UPDATE public.works
SET sn_no = COALESCE(sn_no, 'W-' || substr(md5(random()::text), 1, 12))
WHERE sn_no IS NULL;

UPDATE public.works
SET work_name = COALESCE(work_name, 'Untitled work')
WHERE work_name IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS works_ubqn_unique
ON public.works (ubqn)
WHERE ubqn IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS works_sn_no_unique
ON public.works (sn_no)
WHERE sn_no IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'work_status' AND e.enumlabel = 'Pipeline'
  ) THEN
    ALTER TYPE public.work_status ADD VALUE 'Pipeline';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'work_status' AND e.enumlabel = 'Running R1'
  ) THEN
    ALTER TYPE public.work_status ADD VALUE 'Running R1';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'work_status' AND e.enumlabel = 'Running R2'
  ) THEN
    ALTER TYPE public.work_status ADD VALUE 'Running R2';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'work_status' AND e.enumlabel = 'Completed C1'
  ) THEN
    ALTER TYPE public.work_status ADD VALUE 'Completed C1';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'work_status' AND e.enumlabel = 'Completed C2'
  ) THEN
    ALTER TYPE public.work_status ADD VALUE 'Completed C2';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'work_status' AND e.enumlabel = 'Completed C1*'
  ) THEN
    ALTER TYPE public.work_status ADD VALUE 'Completed C1*';
  END IF;
END $$;
