-- 1) Atualizar funções de segurança para incluir verificação de atividade
CREATE OR REPLACE FUNCTION private.is_active_user(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.has_role(user_id uuid, role_name public.app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Só retorna verdadeiro se o usuário tiver a role E estiver ativo
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = role_name
  ) AND private.is_active_user(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN private.has_role(auth.uid(), 'admin'::public.app_role);
END;
$$;

-- 2) Ajustar políticas de Profiles
-- Permitir que o usuário veja o próprio perfil mesmo inativo (para ver a mensagem de suspensão no React)
DROP POLICY IF EXISTS "Profiles: view own" ON public.profiles;
CREATE POLICY "Profiles: view own" ON public.profiles
  FOR SELECT TO authenticated 
  USING (auth.uid() = id);

-- Impedir atualizações se inativo
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: update own" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id AND private.is_active_user(auth.uid()))
  WITH CHECK (
    auth.uid() = id AND 
    is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

-- Admins devem estar ativos para ver/editar outros
DROP POLICY IF EXISTS "Profiles: admin view all" ON public.profiles;
CREATE POLICY "Profiles: admin view all" ON public.profiles
  FOR SELECT TO authenticated 
  USING (private.is_admin());

DROP POLICY IF EXISTS "Profiles: admin update all" ON public.profiles;
CREATE POLICY "Profiles: admin update all" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (private.is_admin());

-- 3) Ajustar políticas de User Roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated 
  USING (private.is_admin());

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id AND private.is_active_user(auth.uid()));

-- As demais políticas de user_roles (insert, update, delete) já usam is_admin() que agora checa is_active_user()
