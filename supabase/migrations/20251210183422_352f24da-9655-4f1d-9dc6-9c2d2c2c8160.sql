-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins and managers can manage employees" ON public.employees;

-- Create separate policies for better control
CREATE POLICY "Authenticated users can insert employees" 
ON public.employees 
FOR INSERT 
WITH CHECK (is_authenticated_user());

CREATE POLICY "Admins and managers can update employees" 
ON public.employees 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete employees" 
ON public.employees 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));