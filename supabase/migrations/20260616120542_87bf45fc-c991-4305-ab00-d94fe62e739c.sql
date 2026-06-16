DROP POLICY IF EXISTS "Admins can manage vault" ON public.contingency_vault;
CREATE POLICY "Admins can manage vault"
  ON public.contingency_vault FOR ALL TO authenticated
  USING (private.is_admin() AND private.is_active_user(auth.uid()))
  WITH CHECK (private.is_admin() AND private.is_active_user(auth.uid()));