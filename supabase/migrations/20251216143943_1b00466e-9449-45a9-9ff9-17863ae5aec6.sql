-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins and managers can update employees" ON public.employees;

-- Create new permissive policy allowing all authenticated users to update
CREATE POLICY "Authenticated users can update employees"
ON public.employees
FOR UPDATE
TO authenticated
USING (is_authenticated_user())
WITH CHECK (is_authenticated_user());