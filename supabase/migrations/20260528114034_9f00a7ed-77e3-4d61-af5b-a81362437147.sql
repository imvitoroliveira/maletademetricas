-- Simplificar a função para evitar recursão infinita nas políticas de RLS
CREATE OR REPLACE FUNCTION private.is_active_user(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER -- Precisamos de SECURITY DEFINER aqui para ler a tabela profiles ignorando o RLS atual
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND is_active = true
  );
END;
$function$;

-- Garantir que a função private.is_admin também seja SECURITY DEFINER se ela for usada em políticas
CREATE OR REPLACE FUNCTION private.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  );
END;
$function$;
