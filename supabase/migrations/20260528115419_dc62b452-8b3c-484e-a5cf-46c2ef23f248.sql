-- Restaura a função de trigger para novos usuários com search_path fixo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cria o perfil
  INSERT INTO public.profiles (id, is_admin, is_active)
  VALUES (new.id, false, true)
  ON CONFLICT (id) DO NOTHING;

  -- Cria a role padrão (cliente)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'client')
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

-- Garante que a função não seja executável por roles não autorizadas diretamente
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Recria o trigger (primeiro remove se existir para evitar erro)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Garante permissões nas tabelas profiles e user_roles para o service_role (usado pelo trigger)
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
