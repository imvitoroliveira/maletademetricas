-- Migração: 20260509125110_f768579b-a998-438a-923b-e3f702ae9657.sql
-- Create custom_metrics table
CREATE TABLE public.custom_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'active',
    user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_metrics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view custom metrics" 
ON public.custom_metrics FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert custom metrics" 
ON public.custom_metrics FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their own custom metrics" 
ON public.custom_metrics FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own custom metrics" 
ON public.custom_metrics FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_metrics_updated_at
BEFORE UPDATE ON public.custom_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migração: 20260509125129_7aaed017-260a-4457-ba89-a017d2547698.sql
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Migração: 20260509125859_7d1c8957-f1ed-4886-a182-8ed93661e905.sql
-- Table for client permissions (which modules/features they can see)
CREATE TABLE public.client_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    can_view_charts BOOLEAN DEFAULT true,
    can_view_metrics BOOLEAN DEFAULT true,
    can_view_insights BOOLEAN DEFAULT true,
    allowed_modules TEXT[] DEFAULT '{"dashboard"}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add date range columns to custom_metrics for persistence of filtered data
ALTER TABLE public.custom_metrics 
ADD COLUMN IF NOT EXISTS metric_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS period_label TEXT;

-- Enable RLS on permissions
ALTER TABLE public.client_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for client_permissions
CREATE POLICY "Gestor can manage all permissions" 
ON public.client_permissions FOR ALL 
USING (auth.jwt() ->> 'email' = 'ovitoroliveira60@gmail.com');

CREATE POLICY "Clients can view their own permissions" 
ON public.client_permissions FOR SELECT 
USING (auth.uid() = client_id);

-- Update RLS for custom_metrics to be more strict
DROP POLICY IF EXISTS "Anyone can view custom metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Authenticated users can insert custom metrics" ON public.custom_metrics;

CREATE POLICY "Users can view their own custom metrics" 
ON public.custom_metrics FOR SELECT 
USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'ovitoroliveira60@gmail.com');

CREATE POLICY "Gestor can manage all metrics" 
ON public.custom_metrics FOR ALL 
USING (auth.jwt() ->> 'email' = 'ovitoroliveira60@gmail.com');

-- Trigger for updated_at on client_permissions
CREATE TRIGGER update_client_permissions_updated_at
BEFORE UPDATE ON public.client_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migração: 20260509132217_abb7c12f-14e5-4db3-84e9-a0f87acac03c.sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user signup and create profile
-- Note: Since we'll use a manual invite/creation system, we'll also need to ensure the admin exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, is_admin)
    VALUES (NEW.id, NEW.email, (NEW.email = 'ovitoroliveira60@gmail.com'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Secure custom_metrics: users see only their own, admins see all
DROP POLICY IF EXISTS "Users can view their own metrics" ON public.custom_metrics;
CREATE POLICY "Users can view metrics" ON public.custom_metrics
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.custom_metrics;
CREATE POLICY "Users can insert metrics" ON public.custom_metrics
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own metrics" ON public.custom_metrics;
CREATE POLICY "Users can update metrics" ON public.custom_metrics
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    );

-- Ensure client_permissions is properly scoped
ALTER TABLE public.client_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.client_permissions;
CREATE POLICY "Admins can manage permissions" ON public.client_permissions
    FOR ALL USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Clients can view their own permissions" ON public.client_permissions;
CREATE POLICY "Clients can view their own permissions" ON public.client_permissions
    FOR SELECT USING (
        auth.uid() = client_id
    );


-- Migração: 20260509132437_764e8844-211e-4ddb-bac6-22a901025919.sql
-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, is_admin, is_active)
    VALUES (
        NEW.id, 
        NEW.email, 
        (NEW.email = 'ovitoroliveira60@gmail.com'),
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        is_admin = (EXCLUDED.email = 'ovitoroliveira60@gmail.com');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is set up correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also update existing profiles just in case
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'ovitoroliveira60@gmail.com';


-- Migração: 20260509132451_91ecaae4-464a-414b-b0f7-02a0daf8a553.sql
-- Fix Function Search Path Mutable (set search_path)
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Restrict execution of handle_new_user (it's a trigger, no one should call it directly)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;


-- Migração: 20260509134002_97270545-ee2a-4af3-ab32-5d950d5a29dc.sql
-- Update the handle_new_user function to include the new manager email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, is_admin, is_active)
    VALUES (
        NEW.id, 
        NEW.email, 
        (NEW.email = 'ovitoroliveira60@gmail.com' OR NEW.email = 'ovitoroliveira60@gmail.com'),
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        is_admin = (EXCLUDED.email = 'ovitoroliveira60@gmail.com' OR EXCLUDED.email = 'ovitoroliveira60@gmail.com');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update existing profiles just in case
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'ovitoroliveira60@gmail.com';


-- Migração: 20260509135850_1c521289-2b8a-489c-9ea4-631068d33c0a.sql
-- Insert Manager 1
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT 
    gen_random_uuid(), 
    '00000000-0000-0000-0000-000000000000', 
    'ovitoroliveira60@gmail.com', 
    crypt('18644481', gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    now(), 
    now(), 
    'authenticated', 
    '', 
    '', 
    '', 
    ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ovitoroliveira60@gmail.com');

-- Insert Manager 2
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT 
    gen_random_uuid(), 
    '00000000-0000-0000-0000-000000000000', 
    'ovitoroliveira60@gmail.com', 
    crypt('Lucas@2026', gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    now(), 
    now(), 
    'authenticated', 
    '', 
    '', 
    '', 
    ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ovitoroliveira60@gmail.com');

-- Create profiles for the managers
INSERT INTO public.profiles (id, email, is_admin, is_active)
SELECT id, email, true, true
FROM auth.users
WHERE email IN ('ovitoroliveira60@gmail.com', 'ovitoroliveira60@gmail.com')
ON CONFLICT (id) DO UPDATE SET is_admin = true, is_active = true;


-- Migração: 20260509141740_f881cd92-e5a3-4c4a-bfc2-4a60c8a88b8c.sql
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


-- Migração: 20260509143132_da171ecd-9cc6-4625-baaf-33204ef04c50.sql
-- Atualizar a senha do usuário ovitoroliveira60@gmail.com
UPDATE auth.users 
SET encrypted_password = crypt('1864481', gen_salt('bf'))
WHERE email = 'ovitoroliveira60@gmail.com';

-- Garantir que o perfil dele está ativo e é admin
UPDATE public.profiles
SET is_active = true, is_admin = true
WHERE email = 'ovitoroliveira60@gmail.com';


-- Migração: 20260509143425_383f9160-082a-405c-9a37-1c3e5d998b32.sql
UPDATE auth.users 
SET encrypted_password = crypt('1864481', gen_salt('bf', 10))
WHERE email = 'ovitoroliveira60@gmail.com';


-- Migração: 20260509144149_f5e8ab81-a3f3-4fe0-a9ed-0614140ca251.sql

-- 1) Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin'::public.app_role); $$;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) Drop all old recursive policies
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.client_permissions;
DROP POLICY IF EXISTS "Clients can view their own permissions" ON public.client_permissions;
DROP POLICY IF EXISTS "Gestor can manage all permissions" ON public.client_permissions;

DROP POLICY IF EXISTS "Authenticated users can delete their own custom metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Authenticated users can update their own custom metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Gestor can manage all metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Users can insert metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Users can update metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Users can view metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Users can view their own custom metrics" ON public.custom_metrics;

-- 3) Profiles policies (no recursion)
CREATE POLICY "Profiles: self select" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: admin select all" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Profiles: self update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: admin update all" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 4) Client permissions policies
CREATE POLICY "Permissions: client select own" ON public.client_permissions
  FOR SELECT TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Permissions: admin all" ON public.client_permissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) Metrics policies
CREATE POLICY "Metrics: select own or admin" ON public.custom_metrics
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Metrics: insert own or admin" ON public.custom_metrics
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Metrics: update own or admin" ON public.custom_metrics
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Metrics: delete own or admin" ON public.custom_metrics
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- 6) handle_new_user — create profile + role, then trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _is_admin boolean;
BEGIN
  _is_admin := NEW.email IN ('ovitoroliveira60@gmail.com','ovitoroliveira60@gmail.com');

  INSERT INTO public.profiles (id, email, is_admin, is_active)
  VALUES (NEW.id, NEW.email, _is_admin, true)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, is_admin = EXCLUDED.is_admin;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN _is_admin THEN 'admin'::public.app_role ELSE 'user'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7) Backfill roles for existing managers
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE email IN ('ovitoroliveira60@gmail.com','ovitoroliveira60@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL
ON CONFLICT DO NOTHING;

-- 8) Reset password and confirm email for primary admin
UPDATE auth.users
SET encrypted_password = extensions.crypt('1864481', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now(),
    raw_app_meta_data = COALESCE(raw_app_meta_data,'{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb
WHERE email = 'ovitoroliveira60@gmail.com';

UPDATE auth.users
SET encrypted_password = extensions.crypt('1864481', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now(),
    raw_app_meta_data = COALESCE(raw_app_meta_data,'{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb
WHERE email = 'ovitoroliveira60@gmail.com';


-- Migração: 20260509144218_8928c03c-f821-469b-aef9-e9b88c4e8d9e.sql

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;


-- Migração: 20260509203717_b686dd10-e779-4615-ba50-fc2555be7aaf.sql
-- Garantir extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atualizar a senha do gestor principal para '1864481'
-- Nota: O Supabase usa bcrypt. crypt() com salt bcrypt gera o hash compatível.
UPDATE auth.users 
SET encrypted_password = crypt('1864481', gen_salt('bf', 8)),
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


-- Migração: 20260509203728_7b7ff710-6c89-4e16-912c-9d12d7985ff5.sql
-- Revogar acesso público das funções sensíveis
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;

-- Garantir que apenas usuários autenticados (ou o sistema) possam rodar
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;


-- Migração: 20260509204213_96470e02-aadd-4f1e-9fa3-11cb738d17f6.sql
-- Garantir que client_permissions referencia profiles
ALTER TABLE public.client_permissions
  DROP CONSTRAINT IF EXISTS client_permissions_client_id_fkey,
  ADD CONSTRAINT client_permissions_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Garantir que custom_metrics referencia profiles
ALTER TABLE public.custom_metrics
  DROP CONSTRAINT IF EXISTS custom_metrics_user_id_fkey,
  ADD CONSTRAINT custom_metrics_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Garantir que user_roles referencia profiles
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
  ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- Migração: 20260509210317_290b9b32-d4a7-40b3-a112-6f59756b720e.sql
DO $$
DECLARE
  manager_record RECORD;
BEGIN
  FOR manager_record IN
    SELECT id, email
    FROM auth.users
    WHERE lower(email) IN ('ovitoroliveira60@gmail.com', 'ovitoroliveira60@gmail.com')
  LOOP
    UPDATE auth.users
    SET
      aud = 'authenticated',
      role = 'authenticated',
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      updated_at = now()
    WHERE id = manager_record.id;

    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      manager_record.id::text,
      manager_record.id,
      jsonb_build_object(
        'sub', manager_record.id::text,
        'email', manager_record.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      identity_data = EXCLUDED.identity_data,
      updated_at = now();

    INSERT INTO public.profiles (id, email, is_active, is_admin)
    VALUES (manager_record.id, manager_record.email, true, true)
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      is_active = true,
      is_admin = true,
      updated_at = now();

    INSERT INTO public.user_roles (user_id, role)
    VALUES (manager_record.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;

-- Migração: 20260509211139_d901bd46-2f00-43fa-bfa3-a669728dc0f4.sql
-- 1. Create a helper function to check if a user is active
CREATE OR REPLACE FUNCTION public.is_active_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Revoke public execution of security definer functions and grant to necessary roles
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_active_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user(UUID) TO authenticated, service_role;

-- 3. Update Profiles RLS
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (is_active = true); -- Only show active profiles to others

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id AND is_active_user(auth.uid()));

-- Issue 5: Explicit INSERT policy for profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. Update User Roles RLS (Issue 6)
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (is_admin() AND is_active_user(auth.uid()));

CREATE POLICY "Users can view own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id AND is_active_user(auth.uid()));

CREATE POLICY "Admins can insert roles" 
ON public.user_roles FOR INSERT 
WITH CHECK (is_admin() AND is_active_user(auth.uid()));

CREATE POLICY "Admins can update roles" 
ON public.user_roles FOR UPDATE 
USING (is_admin() AND is_active_user(auth.uid()));

CREATE POLICY "Admins can delete roles" 
ON public.user_roles FOR DELETE 
USING (is_admin() AND is_active_user(auth.uid()));


-- 5. Update Client Permissions RLS
DROP POLICY IF EXISTS "Admins can manage client permissions" ON public.client_permissions;
DROP POLICY IF EXISTS "Users can view their own client permissions" ON public.client_permissions;

CREATE POLICY "Admins manage client permissions" 
ON public.client_permissions FOR ALL 
USING (is_admin() AND is_active_user(auth.uid()));

CREATE POLICY "Users view own permissions" 
ON public.client_permissions FOR SELECT 
USING (client_id = auth.uid() AND is_active_user(auth.uid()));


-- 6. Update Custom Metrics RLS
DROP POLICY IF EXISTS "Admins can manage all metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Users can manage their own metrics" ON public.custom_metrics;

CREATE POLICY "Admins manage all metrics" 
ON public.custom_metrics FOR ALL 
USING (is_admin() AND is_active_user(auth.uid()));

CREATE POLICY "Users manage own metrics" 
ON public.custom_metrics FOR ALL 
USING (user_id = auth.uid() AND is_active_user(auth.uid()));


-- Migração: 20260509211243_09e00ac5-a152-43f0-9676-a0dfd6f39237.sql
-- 1. Create a private schema for internal helper functions
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Create the hardened functions in the private schema
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION private.has_role(user_id UUID, role_name public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = $1 AND role = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION private.is_active_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Update all RLS policies to use the private schema functions
-- Drop existing policies first
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

DROP POLICY IF EXISTS "Admins manage client permissions" ON public.client_permissions;
DROP POLICY IF EXISTS "Users view own permissions" ON public.client_permissions;

DROP POLICY IF EXISTS "Admins manage all metrics" ON public.custom_metrics;
DROP POLICY IF EXISTS "Users manage own metrics" ON public.custom_metrics;

-- Recreate policies using private schema
-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id AND private.is_active_user(auth.uid()));

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- User Roles
CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (private.is_admin() AND private.is_active_user(auth.uid()));

CREATE POLICY "Users can view own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id AND private.is_active_user(auth.uid()));

CREATE POLICY "Admins can insert roles" 
ON public.user_roles FOR INSERT 
WITH CHECK (private.is_admin() AND private.is_active_user(auth.uid()));

CREATE POLICY "Admins can update roles" 
ON public.user_roles FOR UPDATE 
USING (private.is_admin() AND private.is_active_user(auth.uid()));

CREATE POLICY "Admins can delete roles" 
ON public.user_roles FOR DELETE 
USING (private.is_admin() AND private.is_active_user(auth.uid()));

-- Client Permissions
CREATE POLICY "Admins manage client permissions" 
ON public.client_permissions FOR ALL 
USING (private.is_admin() AND private.is_active_user(auth.uid()));

CREATE POLICY "Users view own permissions" 
ON public.client_permissions FOR SELECT 
USING (client_id = auth.uid() AND private.is_active_user(auth.uid()));

-- Custom Metrics
CREATE POLICY "Admins manage all metrics" 
ON public.custom_metrics FOR ALL 
USING (private.is_admin() AND private.is_active_user(auth.uid()));

CREATE POLICY "Users manage own metrics" 
ON public.custom_metrics FOR ALL 
USING (user_id = auth.uid() AND private.is_active_user(auth.uid()));

-- 4. Now drop the old functions from the public schema
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_active_user(UUID) CASCADE;

-- 5. Rotate administrator passwords
UPDATE auth.users 
SET encrypted_password = crypt('Secure_Rotated_Admin_2026_!' || gen_random_uuid()::text, gen_salt('bf'))
WHERE email IN ('ovitoroliveira60@gmail.com', 'ovitoroliveira60@gmail.com');


-- Migração: 20260511153516_3c80180f-6f5f-4555-ba2a-b42e7cb670ee.sql
-- Reset admin passwords to a known temporary value
UPDATE auth.users 
SET encrypted_password = crypt('Maleta@2026#Secure', gen_salt('bf'))
WHERE email IN ('ovitoroliveira60@gmail.com', 'ovitoroliveira60@gmail.com');

-- Migração: 20260527185413_a21b5529-832a-4134-b7cc-de1cb21ca303.sql
-- Remove existing self-update policies to consolidate
DROP POLICY IF EXISTS "Profiles: self update" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a secure self-update policy that prevents users from changing their own administrative status
-- This policy allows users to update their own profile but fails if they try to change is_admin or id
CREATE POLICY "Users can update their own profile safely" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  (is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()))
);

-- Ensure service_role (used by Edge Functions and admin tasks) can still manage all aspects
GRANT ALL ON public.profiles TO service_role;


-- Migração: 20260527185442_5dc9a5bf-c5dd-4622-8f42-db7788cfd5cf.sql
-- Remover a política excessivamente permissiva
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Permitir que usuários vejam apenas o próprio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Permitir que administradores vejam todos os perfis (baseado na tabela user_roles para maior segurança)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);


-- Migração: 20260527185509_a544e27e-1470-444f-836f-1500d09f40c0.sql
-- Atualizar as senhas dos administradores para um hash seguro gerado pelo Supabase
-- Estamos usando o hash de uma senha aleatória forte para invalidar a senha '1864481'
-- O usuário deve usar a recuperação de senha ou o admin deve resetar via dashboard do Supabase

UPDATE auth.users 
SET encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
WHERE email IN ('ovitoroliveira60@gmail.com', 'ovitoroliveira60@gmail.com');


-- Migração: 20260527185718_41470cff-6405-4abb-a75d-9620181b7e06.sql
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


-- Migração: 20260527185753_08a5ef44-5775-439d-8094-fc3a7ec72ff9.sql
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


-- Migração: 20260527185835_5a3f3386-2fed-4165-8b46-28269f515e5f.sql
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


-- Migração: 20260527185847_916671a7-06ab-4df5-87e4-5b9dea7b8735.sql
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


-- Migração: 20260527190750_4e1bfb5e-4d6b-4496-8aa9-428d3f6f1104.sql
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


