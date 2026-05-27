-- 1) Revogar execução pública da função de trigger para segurança
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- 2) Limpeza e Consolidação de Políticas da Tabela Profiles
DROP POLICY IF EXISTS "Profiles: self select" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile safely" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Usuários ativos podem ver o próprio perfil
CREATE POLICY "Profiles: view own" ON public.profiles
  FOR SELECT TO authenticated 
  USING (auth.uid() = id AND private.is_active_user(auth.uid()));

-- Usuários ativos podem atualizar o próprio perfil (exceto is_admin)
CREATE POLICY "Profiles: update own" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id AND private.is_active_user(auth.uid()))
  WITH CHECK (
    auth.uid() = id AND 
    is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

-- Admins ativos podem ver todos os perfis
CREATE POLICY "Profiles: admin view all" ON public.profiles
  FOR SELECT TO authenticated 
  USING (private.is_admin() AND private.is_active_user(auth.uid()));

-- Admins ativos podem atualizar todos os perfis
CREATE POLICY "Profiles: admin update all" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (private.is_admin() AND private.is_active_user(auth.uid()));

-- 3) Garantir consistência na Tabela Custom Metrics
DROP POLICY IF EXISTS "Admins manage all metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Users manage own metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Metrics: select own or admin" ON public.custom_metrics;
DROP POLICY IF EXISTS "Metrics: insert own or admin" ON public.custom_metrics;
DROP POLICY IF EXISTS "Metrics: update own or admin" ON public.custom_metrics;
DROP POLICY IF EXISTS "Metrics: delete own or admin" ON public.custom_metrics;

-- Usuários ativos gerenciam suas próprias métricas
CREATE POLICY "Metrics: client access" ON public.custom_metrics
  FOR ALL TO authenticated 
  USING (user_id = auth.uid() AND private.is_active_user(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND private.is_active_user(auth.uid()));

-- Admins ativos gerenciam todas as métricas
CREATE POLICY "Metrics: admin access" ON public.custom_metrics
  FOR ALL TO authenticated 
  USING (private.is_admin() AND private.is_active_user(auth.uid()));
