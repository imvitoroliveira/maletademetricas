-- 1) Revogar execução de handle_new_user de todos os papéis públicos e autenticados
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- 2) Revogar execução de sync_profile_admin_status de todos os papéis públicos e autenticados
REVOKE EXECUTE ON FUNCTION public.sync_profile_admin_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_admin_status() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_admin_status() FROM anon;

-- 3) Garantir que apenas o service_role e o sistema possam executar essas funções (usadas por triggers)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_profile_admin_status() TO service_role;
