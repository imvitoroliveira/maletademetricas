-- Hide Meta secrets from clients; only service_role (edge functions) can read them
REVOKE SELECT (access_token, app_secret) ON public.ad_accounts FROM authenticated;
REVOKE SELECT (access_token, app_secret) ON public.ad_accounts FROM anon;

-- Restrict ad account management to admins only
DROP POLICY IF EXISTS "Users can insert ad accounts" ON public.ad_accounts;
DROP POLICY IF EXISTS "Users can update their ad accounts" ON public.ad_accounts;
DROP POLICY IF EXISTS "Users can delete ad accounts" ON public.ad_accounts;

CREATE POLICY "Admins can insert ad accounts"
  ON public.ad_accounts FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY "Admins can update ad accounts"
  ON public.ad_accounts FOR UPDATE TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Admins can delete ad accounts"
  ON public.ad_accounts FOR DELETE TO authenticated
  USING (private.is_admin());