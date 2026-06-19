-- 1. Drop the insecure view
DROP VIEW IF EXISTS public.user_management_view;

-- 2. Create a secure function instead
CREATE OR REPLACE FUNCTION public.get_user_management()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Optional: Check if the user is a Director or Assistant Director
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND role IN ('Director', 'Assistant Director')
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only Directors can view user management data.';
    END IF;

    RETURN QUERY
    SELECT 
        u.id AS user_id,
        (u.raw_user_meta_data->>'full_name')::TEXT AS full_name,
        u.email::TEXT,
        COALESCE(r.role, 'Pending') AS role,
        (u.raw_user_meta_data->>'avatar_url')::TEXT AS avatar_url,
        u.last_sign_in_at,
        u.created_at
    FROM auth.users u
    LEFT JOIN public.user_roles r ON u.id = r.user_id;
END;
$$;
