-- 1. Remove arbitrary SQL executor (critical backdoor)
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- 2. Lock down sensitive vault columns: only service_role (backend) can read/write them.
REVOKE SELECT (vault_password, vault_recovery_token, vault_recovery_expires) ON public.profiles FROM authenticated;
REVOKE SELECT (vault_password, vault_recovery_token, vault_recovery_expires) ON public.profiles FROM anon;
REVOKE UPDATE (vault_password, vault_recovery_token, vault_recovery_expires) ON public.profiles FROM authenticated;
REVOKE UPDATE (vault_password, vault_recovery_token, vault_recovery_expires) ON public.profiles FROM anon;