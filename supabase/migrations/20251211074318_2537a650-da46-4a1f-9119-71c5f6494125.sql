-- Update division codes to match new naming
UPDATE public.divisions SET code = 'BTP' WHERE name = 'Buildings & Town Planning';
UPDATE public.divisions SET code = 'EnS' WHERE name = 'Environment & Sustainability';