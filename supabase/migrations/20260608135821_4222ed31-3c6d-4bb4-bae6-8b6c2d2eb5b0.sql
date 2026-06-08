CREATE TABLE public.ad_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    account_id TEXT NOT NULL, -- The external ID from Meta/Google etc.
    platform TEXT DEFAULT 'meta',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to link profiles (clients) to specific ad accounts
CREATE TABLE public.profile_ad_accounts (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ad_account_id UUID NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, ad_account_id)
);

-- Add ad_account_id to custom_metrics to allow filtering metrics by account
ALTER TABLE public.custom_metrics ADD COLUMN ad_account_id UUID REFERENCES public.ad_accounts(id) ON DELETE SET NULL;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_accounts TO authenticated;
GRANT ALL ON public.ad_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_ad_accounts TO authenticated;
GRANT ALL ON public.profile_ad_accounts TO service_role;

-- RLS
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_ad_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for ad_accounts
CREATE POLICY "Ad accounts are viewable by authenticated users" ON public.ad_accounts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for profile_ad_accounts
CREATE POLICY "Profile ad accounts are viewable by authenticated users" ON public.profile_ad_accounts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ad_accounts_updated_at 
BEFORE UPDATE ON public.ad_accounts 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();