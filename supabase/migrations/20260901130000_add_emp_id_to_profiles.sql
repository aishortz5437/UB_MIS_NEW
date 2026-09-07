
-- Add employee_id and designation to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation TEXT;

-- Update RLS so Admins/Directors can update other users profiles
-- We can add a new policy
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR UPDATE USING (
        public.has_role(auth.uid(), 'Director') OR 
        public.has_role(auth.uid(), 'Admin') OR
        public.has_role(auth.uid(), 'Assistant Director')
    );

-- Update the secure RPC function to include the new columns
DROP FUNCTION IF EXISTS public.get_user_management();

CREATE OR REPLACE FUNCTION public.get_user_management()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    employee_id TEXT,
    designation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow Director and Assistant Director to fetch this data
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role IN ('Director', 'Assistant Director')
    ) THEN
        RAISE EXCEPTION 'Access denied: Only Directors and Assistant Directors can view user management data.';
    END IF;

    RETURN QUERY
    SELECT 
        p.id AS user_id,
        p.full_name,
        p.email,
        ur.role::text AS role,
        p.avatar_url,
        au.last_sign_in_at,
        p.created_at,
        p.employee_id,
        p.designation
    FROM 
        public.profiles p
    LEFT JOIN 
        public.user_roles ur ON p.id = ur.user_id
    LEFT JOIN 
        auth.users au ON p.id = au.id;
END;
$$;
