DROP POLICY IF EXISTS "Users can insert profile ad accounts" ON public.profile_ad_accounts;
DROP POLICY IF EXISTS "Users can update their profile ad accounts" ON public.profile_ad_accounts;
DROP POLICY IF EXISTS "Users can delete profile ad accounts" ON public.profile_ad_accounts;

CREATE POLICY "Admins can insert profile ad accounts"
  ON public.profile_ad_accounts FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY "Admins can update profile ad accounts"
  ON public.profile_ad_accounts FOR UPDATE TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Admins can delete profile ad accounts"
  ON public.profile_ad_accounts FOR DELETE TO authenticated
  USING (private.is_admin());