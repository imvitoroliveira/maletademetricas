CREATE TABLE public.meta_api_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_account_id UUID REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
    raw_response JSONB NOT NULL,
    metric_date DATE NOT NULL,
    metric_name TEXT NOT NULL,
    raw_value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_api_logs TO authenticated;
GRANT ALL ON public.meta_api_logs TO service_role;

ALTER TABLE public.meta_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" ON public.meta_api_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );