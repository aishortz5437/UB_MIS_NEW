-- Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, permission_name)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Only Directors can view/manage permissions
CREATE POLICY "Directors can view all permissions"
    ON public.user_permissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND (user_roles.role = 'Director' OR user_roles.role = 'Assistant Director')
        )
    );

CREATE POLICY "Directors can manage permissions"
    ON public.user_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND (user_roles.role = 'Director' OR user_roles.role = 'Assistant Director')
        )
    );

-- Allow users to view their own permissions
CREATE POLICY "Users can view own permissions"
    ON public.user_permissions FOR SELECT
    USING (auth.uid() = user_id);

-- Helper function to check for a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Directors automatically have all permissions
    IF EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = _user_id
        AND (user_roles.role = 'Director' OR user_roles.role = 'Assistant Director')
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.user_permissions
        WHERE user_id = _user_id AND permission_name = _permission_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
