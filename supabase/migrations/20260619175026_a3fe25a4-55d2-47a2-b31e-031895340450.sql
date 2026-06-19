ALTER TABLE public.contingency_vault
  ADD COLUMN IF NOT EXISTS software text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS profile_created_date date;

ALTER TABLE public.contingency_vault
  ALTER COLUMN status SET DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contingency_vault_status_check'
  ) THEN
    ALTER TABLE public.contingency_vault
      ADD CONSTRAINT contingency_vault_status_check
      CHECK (status IN ('active','analysis','banned'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contingency_vault_software_check'
  ) THEN
    ALTER TABLE public.contingency_vault
      ADD CONSTRAINT contingency_vault_software_check
      CHECK (software IS NULL OR software IN ('dolphin','incogniton'));
  END IF;
END$$;