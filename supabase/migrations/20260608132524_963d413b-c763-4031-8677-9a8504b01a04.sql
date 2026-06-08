CREATE TABLE public.contingency_vault (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    access_url TEXT,
    credentials JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contingency_vault TO authenticated;
GRANT ALL ON public.contingency_vault TO service_role;

-- Enable RLS
ALTER TABLE public.contingency_vault ENABLE ROW LEVEL SECURITY;

-- Only admins can manage vault
CREATE POLICY "Admins can manage vault" ON public.contingency_vault
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Update trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contingency_vault_updated_at
    BEFORE UPDATE ON public.contingency_vault
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();