-- Convert functions to SECURITY INVOKER to satisfy linter
ALTER FUNCTION private.is_admin() SECURITY INVOKER;
ALTER FUNCTION private.has_role(uuid, public.app_role) SECURITY INVOKER;
ALTER FUNCTION private.is_active_user(uuid) SECURITY INVOKER;

-- Grant execute back to authenticated so RLS still works
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_user(uuid) TO authenticated;

-- Ensure triggers remain SECURITY DEFINER but are not executable by public
-- Triggers MUST be SECURITY DEFINER to work during auth/system events
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;
ALTER FUNCTION public.sync_profile_admin_status() SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_admin_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_profile_admin_status() TO service_role;
