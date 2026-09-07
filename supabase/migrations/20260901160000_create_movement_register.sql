
-- Create Movement Register table
CREATE TABLE IF NOT EXISTS public.movement_register (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_out TIME NOT NULL,
    time_in TIME,
    location TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Logged', 
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.movement_register ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_movement_register_updated_at BEFORE UPDATE ON public.movement_register
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
-- Anyone can view all movements (Universal Register)
CREATE POLICY "Anyone can view all movements" ON public.movement_register
    FOR SELECT USING (true);

-- Anyone can insert their own movements
CREATE POLICY "Users can insert own movements" ON public.movement_register
    FOR INSERT WITH CHECK (auth.uid() = employee_id);

-- Anyone can update their own movements (e.g. to punch in)
CREATE POLICY "Users can update own movements" ON public.movement_register
    FOR UPDATE USING (auth.uid() = employee_id);
