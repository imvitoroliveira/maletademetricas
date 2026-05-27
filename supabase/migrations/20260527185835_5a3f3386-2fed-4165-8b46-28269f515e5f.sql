-- 1) Atualizar a função handle_new_user para não ter e-mails hardcoded
-- Agora ela apenas cria o perfil e o usuário padrão. 
-- A definição de admin deve ser feita via tabela user_roles pelo dashboard ou Edge Function.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin, is_active)
  VALUES (NEW.id, NEW.email, false, true)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2) A função private.is_admin() já usa a tabela user_roles, o que é correto e seguro.
-- Ela não precisa de alterações pois já é dinâmica.

-- 3) Garantir que a coluna is_admin na tabela profiles reflita o que está em user_roles
-- Isso evita inconsistências e remove a necessidade de checar e-mails.
CREATE OR REPLACE FUNCTION public.sync_profile_admin_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.role = 'admin'::public.app_role THEN
    UPDATE public.profiles SET is_admin = true WHERE id = NEW.user_id;
  ELSIF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.role = 'admin'::public.app_role THEN
    -- Verifica se ainda tem alguma role de admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = OLD.user_id AND role = 'admin'::public.app_role) THEN
      UPDATE public.profiles SET is_admin = false WHERE id = OLD.user_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_user_role_change ON public.user_roles;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_admin_status();
