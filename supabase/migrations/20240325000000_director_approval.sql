-- Allow Directors and Assistant Directors to approve requests and update all fields
DROP POLICY IF EXISTS "Directors and ADs can update works" ON public.works;

CREATE POLICY "Directors and ADs can update works" ON public.works
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'Director' OR user_roles.role = 'Assistant Director')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'Director' OR user_roles.role = 'Assistant Director')
  )
);

-- Additionally, ensure they can view the works:
DROP POLICY IF EXISTS "Directors and ADs can view works" ON public.works;
CREATE POLICY "Directors and ADs can view works" ON public.works
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'Director' OR user_roles.role = 'Assistant Director')
  )
);
