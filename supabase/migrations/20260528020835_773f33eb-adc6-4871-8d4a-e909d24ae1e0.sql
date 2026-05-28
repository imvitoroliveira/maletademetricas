-- Revoke execute from public and authenticated roles for security definer functions in private schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM anon;

-- Grant execute back to service_role and postgres
GRANT EXECUTE ON FUNCTION private.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION private.is_active_user(uuid) TO service_role;

-- Ensure triggers and functions in public schema are also restricted if they are SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.sync_profile_admin_status() FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_profile_admin_status() TO service_role;
