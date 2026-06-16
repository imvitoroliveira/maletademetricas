-- Column-level security: hide Meta API credentials from client-facing roles.
-- Edge functions use the service_role, which keeps full access.

REVOKE SELECT ON public.ad_accounts FROM authenticated;
REVOKE SELECT ON public.ad_accounts FROM anon;

GRANT SELECT (id, name, account_id, platform, created_at, updated_at)
  ON public.ad_accounts TO authenticated;

GRANT ALL ON public.ad_accounts TO service_role;