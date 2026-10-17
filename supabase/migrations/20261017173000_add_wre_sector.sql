-- 1. Add Water Resource Engineering (WRE) sector to divisions safely without requiring a unique constraint
INSERT INTO public.divisions (name, code, description)
SELECT 'Water Resource Engineering', 'WRE', 'Water resource engineering and management'
WHERE NOT EXISTS (
  SELECT 1 FROM public.divisions WHERE UPPER(code) = 'WRE' OR LOWER(name) = 'water resource engineering'
);

-- 2. Ensure RLS policy on divisions supports current app roles for management
DROP POLICY IF EXISTS "Admins can manage divisions" ON public.divisions;
DROP POLICY IF EXISTS "Admins and Directors can manage divisions" ON public.divisions;
CREATE POLICY "Admins and Directors can manage divisions" ON public.divisions
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'Director')
    OR public.has_role(auth.uid(), 'Assistant Director')
    OR public.has_role(auth.uid(), 'Admin')
    OR public.has_role(auth.uid(), 'Co-ordinator')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'Director')
    OR public.has_role(auth.uid(), 'Assistant Director')
    OR public.has_role(auth.uid(), 'Admin')
    OR public.has_role(auth.uid(), 'Co-ordinator')
  );

-- 3. Add WRE node to org_hierarchy if org_hierarchy exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'org_hierarchy'
  ) THEN
    INSERT INTO public.org_hierarchy (position_name, position_order)
    SELECT 'WRE', 8
    WHERE NOT EXISTS (
      SELECT 1 FROM public.org_hierarchy WHERE UPPER(position_name) = 'WRE'
    );
  END IF;
END $$;
