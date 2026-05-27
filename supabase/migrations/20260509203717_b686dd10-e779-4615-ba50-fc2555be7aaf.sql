-- Garantir extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atualizar a senha do gestor principal para 'REDACTED_EXPOSED_PASSWORD'
-- Nota: O Supabase usa bcrypt. crypt() com salt bcrypt gera o hash compatível.
UPDATE auth.users 
SET encrypted_password = crypt('REDACTED_EXPOSED_PASSWORD', gen_salt('bf', 8)),
    email_confirmed_at = now(),
    updated_at = now(),
    confirmation_token = '',
    recovery_token = ''
WHERE email = 'ovitoroliveira60@gmail.com';

-- Garantir que o gestor tenha perfil ativo e admin
INSERT INTO public.profiles (id, email, is_active, is_admin)
SELECT id, email, true, true 
FROM auth.users 
WHERE email = 'ovitoroliveira60@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET is_active = true, is_admin = true, updated_at = now();

-- Garantir papel de admin na tabela user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'ovitoroliveira60@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Corrigir/Reforçar a função has_role para evitar qualquer erro de contexto
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Garantir que a função is_admin() use o caminho correto
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

-- Recriar o trigger de criação automática de perfil para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, email, is_active, is_admin)
  VALUES (new.id, new.email, true, false);

  -- Criar role inicial (user)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');

  RETURN new;
END;
$$;

-- Remover trigger antigo se existir e criar novo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
