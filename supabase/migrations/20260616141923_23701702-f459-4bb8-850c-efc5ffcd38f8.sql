-- 1) Ad accounts: restrict client reads to their own linked accounts
DROP POLICY IF EXISTS "Ad accounts are viewable by authenticated users" ON public.ad_accounts;
CREATE POLICY "Ad accounts are viewable by authenticated users"
  ON public.ad_accounts
  FOR SELECT
  TO authenticated
  USING (
    private.is_admin()
    OR (
      private.is_active_user(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profile_ad_accounts paa
        WHERE paa.ad_account_id = ad_accounts.id
          AND paa.profile_id = auth.uid()
      )
    )
  );

-- 2) meta_api_logs: use centralized admin + active check
DROP POLICY IF EXISTS "Admins can view all logs" ON public.meta_api_logs;
CREATE POLICY "Admins can view all logs"
  ON public.meta_api_logs
  FOR SELECT
  TO authenticated
  USING (private.is_admin() AND private.is_active_user(auth.uid()));

-- 3) campaigns: use centralized admin + active check
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.campaigns;
CREATE POLICY "Admins can manage campaigns"
  ON public.campaigns
  FOR ALL
  TO authenticated
  USING (private.is_admin() AND private.is_active_user(auth.uid()))
  WITH CHECK (private.is_admin() AND private.is_active_user(auth.uid()));

-- 4) Prevent privilege escalation: block non-admins from changing is_admin / is_active
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may change anything.
  IF private.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot modify privileged columns on their own row.
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Not allowed to modify privileged columns (is_admin, is_active).';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();