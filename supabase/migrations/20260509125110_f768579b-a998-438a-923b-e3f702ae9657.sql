-- Create custom_metrics table
CREATE TABLE public.custom_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'active',
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_metrics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view custom metrics" 
ON public.custom_metrics FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert custom metrics" 
ON public.custom_metrics FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their own custom metrics" 
ON public.custom_metrics FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own custom metrics" 
ON public.custom_metrics FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_metrics_updated_at
BEFORE UPDATE ON public.custom_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();