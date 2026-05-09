-- Remover políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Habilitar RLS (caso não esteja)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para visualização (Leitura): O usuário pode ver seu próprio perfil
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Política para atualização: O usuário pode atualizar seu próprio perfil
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Política adicional para GESTORES: Eles podem ver perfis de clientes que criaram
-- (Como o gestor precisa listar clientes no UserManager)
CREATE POLICY "Managers can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
