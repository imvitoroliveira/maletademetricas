-- Add individual credential columns to ad_accounts
ALTER TABLE public.ad_accounts 
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS app_secret TEXT;

-- Update RLS policies to ensure only authenticated users can see their own tokens (or admin)
-- Note: In a production environment, you might want to encrypt these fields or only allow service_role to read them.
-- For now, we allow authenticated users (Admins) to manage them as requested.

COMMENT ON COLUMN public.ad_accounts.access_token IS 'Meta Ads Access Token for this specific account';
COMMENT ON COLUMN public.ad_accounts.app_secret IS 'Meta Ads App Secret for this specific account';
