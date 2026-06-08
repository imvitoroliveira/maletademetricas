ALTER TABLE public.profiles ADD COLUMN vault_recovery_token TEXT;
ALTER TABLE public.profiles ADD COLUMN vault_recovery_expires TIMESTAMP WITH TIME ZONE;

-- Grant access to these new columns for the authenticated user and service role
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;