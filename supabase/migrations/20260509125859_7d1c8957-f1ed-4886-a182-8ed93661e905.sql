-- Table for client permissions (which modules/features they can see)
CREATE TABLE public.client_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    can_view_charts BOOLEAN DEFAULT true,
    can_view_metrics BOOLEAN DEFAULT true,
    can_view_insights BOOLEAN DEFAULT true,
    allowed_modules TEXT[] DEFAULT '{"dashboard"}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add date range columns to custom_metrics for persistence of filtered data
ALTER TABLE public.custom_metrics 
ADD COLUMN IF NOT EXISTS metric_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS period_label TEXT;

-- Enable RLS on permissions
ALTER TABLE public.client_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for client_permissions
CREATE POLICY "Gestor can manage all permissions" 
ON public.client_permissions FOR ALL 
USING (auth.jwt() ->> 'email' = 'ADMIN_EMAIL_1');

CREATE POLICY "Clients can view their own permissions" 
ON public.client_permissions FOR SELECT 
USING (auth.uid() = client_id);

-- Update RLS for custom_metrics to be more strict
DROP POLICY IF EXISTS "Anyone can view custom metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Authenticated users can insert custom metrics" ON public.custom_metrics;

CREATE POLICY "Users can view their own custom metrics" 
ON public.custom_metrics FOR SELECT 
USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'ADMIN_EMAIL_1');

CREATE POLICY "Gestor can manage all metrics" 
ON public.custom_metrics FOR ALL 
USING (auth.jwt() ->> 'email' = 'ADMIN_EMAIL_1');

-- Trigger for updated_at on client_permissions
CREATE TRIGGER update_client_permissions_updated_at
BEFORE UPDATE ON public.client_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();