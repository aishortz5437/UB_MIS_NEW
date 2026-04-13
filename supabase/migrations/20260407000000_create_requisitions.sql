CREATE TABLE IF NOT EXISTS public.requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE NOT NULL,
    month TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    designation TEXT,
    ern TEXT,
    amount_needed NUMERIC DEFAULT 0,
    previously_drawn NUMERIC DEFAULT 0,
    purpose TEXT,
    is_adjustment BOOLEAN DEFAULT FALSE,
    adjustment_items JSONB DEFAULT '[]'::jsonb
);

-- Set up Row Level Security
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all requisitions
CREATE POLICY "Enable read access for all authenticated users"
    ON public.requisitions FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert requisitions
CREATE POLICY "Enable insert access for authenticated users"
    ON public.requisitions FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update requisitions
CREATE POLICY "Enable update access for authenticated users"
    ON public.requisitions FOR UPDATE
    TO authenticated
    USING (true);

-- Allow authenticated users to delete requisitions
CREATE POLICY "Enable delete access for authenticated users"
    ON public.requisitions FOR DELETE
    TO authenticated
    USING (true);
