-- Create enum types for status, priority, and roles
CREATE TYPE public.work_status AS ENUM ('Pending', 'In Progress', 'Review', 'Completed');
CREATE TYPE public.work_priority AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff');

-- Create divisions table
CREATE TABLE public.divisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  UNIQUE (user_id, role)
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'staff',
  division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create works table
CREATE TABLE public.works (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sn_no TEXT NOT NULL UNIQUE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE RESTRICT,
  order_no TEXT,
  order_date DATE,
  work_name TEXT NOT NULL,
  consultancy_cost DECIMAL(15, 2) DEFAULT 0,
  dpr_cost DECIMAL(15, 2) DEFAULT 0,
  remaining_payment DECIMAL(15, 2) DEFAULT 0,
  total_cost DECIMAL(15, 2) GENERATED ALWAYS AS (COALESCE(consultancy_cost, 0) + COALESCE(dpr_cost, 0) + COALESCE(remaining_payment, 0)) STORED,
  status work_status NOT NULL DEFAULT 'Pending',
  priority work_priority NOT NULL DEFAULT 'Medium',
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  start_date DATE,
  due_date DATE,
  remarks_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create remarks table
CREATE TABLE public.remarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attachments table
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id UUID REFERENCES public.works(id) ON DELETE CASCADE,
  remark_id UUID REFERENCES public.remarks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);

-- Enable RLS on all tables
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any role
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- RLS Policies for divisions (read for all authenticated, write for admin/manager)
CREATE POLICY "Authenticated users can view divisions" ON public.divisions
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Admins can manage divisions" ON public.divisions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for employees (read for all authenticated, write for admin/manager)
CREATE POLICY "Authenticated users can view employees" ON public.employees
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Admins and managers can manage employees" ON public.employees
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- RLS Policies for works
CREATE POLICY "Authenticated users can view works" ON public.works
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Authenticated users can insert works" ON public.works
  FOR INSERT WITH CHECK (public.is_authenticated_user());

CREATE POLICY "Authenticated users can update works" ON public.works
  FOR UPDATE USING (public.is_authenticated_user());

CREATE POLICY "Admins can delete works" ON public.works
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for remarks
CREATE POLICY "Authenticated users can view remarks" ON public.remarks
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Authenticated users can insert remarks" ON public.remarks
  FOR INSERT WITH CHECK (public.is_authenticated_user());

CREATE POLICY "Authenticated users can update own remarks" ON public.remarks
  FOR UPDATE USING (public.is_authenticated_user());

-- RLS Policies for attachments
CREATE POLICY "Authenticated users can view attachments" ON public.attachments
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Authenticated users can insert attachments" ON public.attachments
  FOR INSERT WITH CHECK (public.is_authenticated_user());

CREATE POLICY "Admins can delete attachments" ON public.attachments
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tasks
CREATE POLICY "Authenticated users can view tasks" ON public.tasks
  FOR SELECT USING (public.is_authenticated_user());

CREATE POLICY "Authenticated users can manage tasks" ON public.tasks
  FOR ALL USING (public.is_authenticated_user());

-- Storage policies for attachments bucket
CREATE POLICY "Authenticated users can view attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'attachments' AND public.has_role(auth.uid(), 'admin'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_works_updated_at BEFORE UPDATE ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'staff');
  
  RETURN new;
END;
$$;

-- Trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default divisions
INSERT INTO public.divisions (name, code, description) VALUES
  ('Roads & Bridges', 'RnB', 'Road and bridge construction and maintenance'),
  ('Architecture', 'Arch', 'Architectural design and building construction'),
  ('Engineering Services', 'Ens', 'General engineering and technical services');