-- Remove broad table-level SELECT (it overrides column-level restrictions)
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

-- Grant SELECT only on non-sensitive columns
GRANT SELECT (id, email, is_admin, is_active, created_at, updated_at)
  ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;