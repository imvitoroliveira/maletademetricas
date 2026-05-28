-- 1) Fix Search Path Mutable for public functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 2) Fix Search Path Mutable for private functions
ALTER FUNCTION private.is_admin() SET search_path = public;
ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path = public;

-- 3) Revoke execution on SECURITY DEFINER functions from PUBLIC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;

