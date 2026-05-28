-- 1) Critical: Secure exec_sql
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
ALTER FUNCTION public.exec_sql(text) SET search_path = public;

-- 2) Fix Search Path for other functions
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.sync_profile_admin_status() SET search_path = public;
ALTER FUNCTION private.is_active_user(uuid) SET search_path = public;

-- 3) Revoke execution for all SECURITY DEFINER functions from PUBLIC
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_admin_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_active_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;

-- 4) Redundant but safe: Revoke from authenticated where not needed
-- (Assuming only the system/triggers should call these)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_admin_status() FROM authenticated;
