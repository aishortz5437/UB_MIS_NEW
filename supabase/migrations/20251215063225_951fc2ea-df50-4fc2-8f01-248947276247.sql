-- Fix 1: Change employee UPDATE policy from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Admins and managers can update employees" ON public.employees;
CREATE POLICY "Admins and managers can update employees" 
ON public.employees 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Fix 2: Add client_name column to works table
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Fix 3: Rename 'Pending' to 'Pipeline' in work_status enum
ALTER TYPE public.work_status RENAME VALUE 'Pending' TO 'Pipeline';

-- Fix 4: Create org_hierarchy table for organization structure
CREATE TABLE public.org_hierarchy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_name TEXT NOT NULL UNIQUE,
  position_order INTEGER NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on org_hierarchy
ALTER TABLE public.org_hierarchy ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_hierarchy
CREATE POLICY "Authenticated users can view hierarchy" 
ON public.org_hierarchy 
FOR SELECT 
TO authenticated
USING (is_authenticated_user());

CREATE POLICY "Admins can manage hierarchy" 
ON public.org_hierarchy 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default hierarchy positions
INSERT INTO public.org_hierarchy (position_name, position_order) VALUES
  ('Director', 1),
  ('Assistant Director', 2),
  ('Manager', 3),
  ('HOD', 4),
  ('Co-Ordinator', 5),
  ('Engineer', 6),
  ('Intern', 7);

-- Add trigger for updated_at
CREATE TRIGGER update_org_hierarchy_updated_at
BEFORE UPDATE ON public.org_hierarchy
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();