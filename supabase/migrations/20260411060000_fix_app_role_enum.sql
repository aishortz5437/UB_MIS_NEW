-- ============================================================================
-- FIX: Add missing values to the `app_role` enum
-- ============================================================================
-- The original enum was: ('admin', 'manager', 'staff')
-- The app now uses:       Director, Assistant Director, Admin, Co-ordinator,
--                         Junior Engineer, Pending
--
-- Without these values, the handle_new_user() trigger fails on sign-up
-- because it tries to insert 'Pending', which is not a valid enum member.
-- This breaks BOTH Google OAuth and email/password registration.
-- ============================================================================

-- Step 1: Add the new role values to the existing enum
-- (IF NOT EXISTS prevents errors if this migration is re-run on a DB that was
--  manually patched. Available since Postgres 12.)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Director';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Assistant Director';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Co-ordinator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Junior Engineer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Pending';

-- Step 2: Update the column default from 'staff' to 'Pending'
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'Pending';

-- Step 3: Migrate any existing rows that still have old enum values
UPDATE public.user_roles SET role = 'Admin'           WHERE role = 'admin';
UPDATE public.user_roles SET role = 'Director'        WHERE role = 'manager';
UPDATE public.user_roles SET role = 'Junior Engineer' WHERE role = 'staff';
