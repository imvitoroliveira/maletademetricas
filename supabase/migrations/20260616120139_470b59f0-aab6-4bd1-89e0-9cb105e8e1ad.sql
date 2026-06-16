-- campaigns: enforce active flag on client read path
DROP POLICY IF EXISTS "Users can view campaigns for their ad accounts" ON public.campaigns;
CREATE POLICY "Users can view campaigns for their ad accounts"
  ON public.campaigns FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR (
      private.is_active_user(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profile_ad_accounts paa
        WHERE paa.ad_account_id = campaigns.ad_account_id
          AND paa.profile_id = auth.uid()
      )
    )
  );

-- profile_ad_accounts: only admins or the active owner
DROP POLICY IF EXISTS "Profile ad accounts are viewable by authenticated users" ON public.profile_ad_accounts;
CREATE POLICY "Profile ad accounts are viewable by authenticated users"
  ON public.profile_ad_accounts FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR (profile_id = auth.uid() AND private.is_active_user(auth.uid()))
  );

-- ad_accounts: only admins or active users
DROP POLICY IF EXISTS "Ad accounts are viewable by authenticated users" ON public.ad_accounts;
CREATE POLICY "Ad accounts are viewable by authenticated users"
  ON public.ad_accounts FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_active_user(auth.uid())
  );