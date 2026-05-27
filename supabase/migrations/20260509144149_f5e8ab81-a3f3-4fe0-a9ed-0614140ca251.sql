
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
  _is_admin := NEW.email IN ('ovitoroliveira60@gmail.com','equipeanalisescia@gmail.com');

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
WHERE email IN ('ovitoroliveira60@gmail.com','equipeanalisescia@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL
ON CONFLICT DO NOTHING;

-- 8) Reset password and confirm email for primary admin
UPDATE auth.users
SET encrypted_password = extensions.crypt('REDACTED_EXPOSED_PASSWORD', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now(),
    raw_app_meta_data = COALESCE(raw_app_meta_data,'{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb
WHERE email = 'ovitoroliveira60@gmail.com';

UPDATE auth.users
SET encrypted_password = extensions.crypt('REDACTED_EXPOSED_PASSWORD', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now(),
    raw_app_meta_data = COALESCE(raw_app_meta_data,'{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb
WHERE email = 'equipeanalisescia@gmail.com';
