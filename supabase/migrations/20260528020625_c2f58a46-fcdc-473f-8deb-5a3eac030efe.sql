-- Revoke EXECUTE from PUBLIC for all SECURITY DEFINER functions in public and private schemas
-- This addresses the linter warning 0028_anon_security_definer_function_executable

-- First, ensure all have a safe search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.sync_profile_admin_status() SET search_path = public;
ALTER FUNCTION public.exec_sql(text) SET search_path = public;
ALTER FUNCTION private.is_admin() SET search_path = public;
ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION private.is_active_user(uuid) SET search_path = public;

-- Revoke all permissions from PUBLIC (which includes anon)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_profile_admin_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_active_user(uuid) FROM PUBLIC;

-- Explicitly revoke from anon just to be doubly sure
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.sync_profile_admin_status() FROM anon;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION private.is_admin() FROM anon;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION private.is_active_user(uuid) FROM anon;

-- Re-grant EXECUTE only to necessary roles
-- helper functions used in RLS policies need to be executable by authenticated users
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_user(uuid) TO authenticated;

-- Grant all to service_role for administrative tasks
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.sync_profile_admin_status() TO service_role;
GRANT ALL ON FUNCTION public.exec_sql(text) TO service_role;
GRANT ALL ON FUNCTION private.is_admin() TO service_role;
GRANT ALL ON FUNCTION private.has_role(uuid, public.app_role) TO service_role;
GRANT ALL ON FUNCTION private.is_active_user(uuid) TO service_role;
