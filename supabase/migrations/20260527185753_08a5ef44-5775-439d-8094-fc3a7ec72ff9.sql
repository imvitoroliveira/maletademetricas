-- Limpar e consolidar políticas da tabela client_permissions
DROP POLICY IF EXISTS "Permissions: client select own" ON public.client_permissions;
DROP POLICY IF EXISTS "Admins manage client permissions" ON public.client_permissions;
DROP POLICY IF EXISTS "Users view own permissions" ON public.client_permissions;
DROP POLICY IF EXISTS "Admins manage all permissions" ON public.client_permissions;
DROP POLICY IF EXISTS "Clients can view their own permissions" ON public.client_permissions;
DROP POLICY IF EXISTS "Gestor can manage all permissions" ON public.client_permissions;

-- Usuários ativos podem ver suas próprias permissões
CREATE POLICY "Permissions: view own" ON public.client_permissions
  FOR SELECT TO authenticated 
  USING (client_id = auth.uid() AND private.is_active_user(auth.uid()));

-- Admins ativos gerenciam tudo
CREATE POLICY "Permissions: admin access" ON public.client_permissions
  FOR ALL TO authenticated 
  USING (private.is_admin() AND private.is_active_user(auth.uid()));
