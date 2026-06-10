CREATE TABLE public.campaigns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_account_id UUID NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
    remote_campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT,
    objective TEXT,
    budget NUMERIC,
    spent NUMERIC DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(ad_account_id, remote_campaign_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Policy for viewing: User can view if they are admin OR if they have access to the ad_account through profile_ad_accounts
CREATE POLICY "Users can view campaigns for their ad accounts" ON public.campaigns
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_admin = true
        ) OR
        EXISTS (
            SELECT 1 FROM public.profile_ad_accounts paa
            WHERE paa.ad_account_id = campaigns.ad_account_id AND paa.profile_id = auth.uid()
        )
    );

-- Policy for management: Only admins can manage
CREATE POLICY "Admins can manage campaigns" ON public.campaigns
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- Update trigger
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();