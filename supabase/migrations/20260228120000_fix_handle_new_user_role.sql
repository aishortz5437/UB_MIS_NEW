-- Fix: Update handle_new_user() to use 'Pending' instead of 'staff'
-- The app_role enum was updated to use new role names (Director, Assistant Director, 
-- Admin, Co-ordinator, Junior Engineer, Pending) but the trigger still referenced the 
-- old 'staff' value, causing new user signups (both Google OAuth and email) to fail.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'Pending');

  RETURN new;
END;
$$;
