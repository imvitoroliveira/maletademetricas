-- Redefinir as funções para serem mais robustas contra recursão
-- Usamos SECURITY DEFINER para que elas ignorem RLS ao verificar status básico
CREATE OR REPLACE FUNCTION private.is_active_user(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificação direta na tabela profiles
  -- Como é SECURITY DEFINER, ele ignora as políticas de RLS da própria tabela ao fazer este SELECT
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND is_active = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificação direta na tabela user_roles
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  );
END;
$function$;

-- Agora, vamos ajustar as políticas de 'profiles' para evitar recursão
-- Primeiro removemos as políticas problemáticas
DROP POLICY IF EXISTS "Profiles: view own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin view all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin update all" ON public.profiles;

-- Recriamos as políticas de forma segura
-- Importante: No SELECT do próprio perfil, não podemos chamar is_active_user(auth.uid()) 
-- se is_active_user faz SELECT em profiles, pois isso gera recursão se o RLS for disparado de novo.
-- No entanto, como a função é SECURITY DEFINER, o SELECT dentro dela NÃO dispara RLS.
-- O problema acontece quando o PostgreSQL tenta planejar a execução.

CREATE POLICY "Profiles: view own" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id); -- Simplificado: se você é o dono, você vê. O is_active é checado na sessão/app.

CREATE POLICY "Profiles: update own" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: admin view all" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (private.is_admin());

CREATE POLICY "Profiles: admin update all" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());
