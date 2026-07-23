
-- 1) Wrapper público chamável via .rpc
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Atualiza políticas para usar public.has_role no lugar de private.is_admin

-- ad_accounts
DROP POLICY IF EXISTS "Admins can insert ad accounts" ON public.ad_accounts;
CREATE POLICY "Admins can insert ad accounts"
  ON public.ad_accounts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can update ad accounts" ON public.ad_accounts;
CREATE POLICY "Admins can update ad accounts"
  ON public.ad_accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can delete ad accounts" ON public.ad_accounts;
CREATE POLICY "Admins can delete ad accounts"
  ON public.ad_accounts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Ad accounts are viewable by authenticated users" ON public.ad_accounts;
CREATE POLICY "Ad accounts are viewable by authenticated users"
  ON public.ad_accounts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR (
      private.is_active_user(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profile_ad_accounts paa
        WHERE paa.ad_account_id = ad_accounts.id AND paa.profile_id = auth.uid()
      )
    )
  );

-- campaigns
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.campaigns;
CREATE POLICY "Admins can manage campaigns"
  ON public.campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Users can view campaigns for their ad accounts" ON public.campaigns;
CREATE POLICY "Users can view campaigns for their ad accounts"
  ON public.campaigns FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR (
      private.is_active_user(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profile_ad_accounts paa
        WHERE paa.ad_account_id = campaigns.ad_account_id AND paa.profile_id = auth.uid()
      )
    )
  );

-- client_permissions
DROP POLICY IF EXISTS "Permissions: admin access" ON public.client_permissions;
CREATE POLICY "Permissions: admin access"
  ON public.client_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- contingency_vault
DROP POLICY IF EXISTS "Admins can manage vault" ON public.contingency_vault;
CREATE POLICY "Admins can manage vault"
  ON public.contingency_vault FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- custom_metrics
DROP POLICY IF EXISTS "Metrics: admin access" ON public.custom_metrics;
CREATE POLICY "Metrics: admin access"
  ON public.custom_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- meta_api_logs
DROP POLICY IF EXISTS "Admins can view all logs" ON public.meta_api_logs;
CREATE POLICY "Admins can view all logs"
  ON public.meta_api_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- profile_ad_accounts
DROP POLICY IF EXISTS "Admins can insert profile ad accounts" ON public.profile_ad_accounts;
CREATE POLICY "Admins can insert profile ad accounts"
  ON public.profile_ad_accounts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can update profile ad accounts" ON public.profile_ad_accounts;
CREATE POLICY "Admins can update profile ad accounts"
  ON public.profile_ad_accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can delete profile ad accounts" ON public.profile_ad_accounts;
CREATE POLICY "Admins can delete profile ad accounts"
  ON public.profile_ad_accounts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Profile ad accounts are viewable by authenticated users" ON public.profile_ad_accounts;
CREATE POLICY "Profile ad accounts are viewable by authenticated users"
  ON public.profile_ad_accounts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR (profile_id = auth.uid() AND private.is_active_user(auth.uid()))
  );

-- profiles (admin views/updates)
DROP POLICY IF EXISTS "Profiles: admin view all" ON public.profiles;
CREATE POLICY "Profiles: admin view all"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Profiles: admin update all" ON public.profiles;
CREATE POLICY "Profiles: admin update all"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 3) Torna profiles.is_admin e profiles.is_active somente-leitura para usuários autenticados
-- (elas seguem sendo atualizadas via triggers SECURITY DEFINER a partir de user_roles/admin actions)
REVOKE UPDATE (is_admin, is_active) ON public.profiles FROM authenticated;

-- 4) Mantém compat: private.is_admin() agora delega para public.has_role
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(),'admin');
$$;
