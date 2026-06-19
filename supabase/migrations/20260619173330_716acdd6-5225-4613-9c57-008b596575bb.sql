ALTER TABLE public.ad_accounts
  ADD COLUMN IF NOT EXISTS software text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.ad_accounts
  DROP CONSTRAINT IF EXISTS ad_accounts_software_check;
ALTER TABLE public.ad_accounts
  ADD CONSTRAINT ad_accounts_software_check
  CHECK (software IS NULL OR software IN ('dolphin', 'incogniton'));

ALTER TABLE public.ad_accounts
  DROP CONSTRAINT IF EXISTS ad_accounts_status_check;
ALTER TABLE public.ad_accounts
  ADD CONSTRAINT ad_accounts_status_check
  CHECK (status IN ('active', 'analysis', 'banned'));