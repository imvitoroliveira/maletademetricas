-- Set secure search_path for remaining trigger functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- Verification of other functions (already set in recent migrations, but repeated here for completeness)
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.sync_profile_admin_status() SET search_path = public;
ALTER FUNCTION public.exec_sql(text) SET search_path = public;
ALTER FUNCTION private.is_admin() SET search_path = public;
ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION private.is_active_user(uuid) SET search_path = public;
