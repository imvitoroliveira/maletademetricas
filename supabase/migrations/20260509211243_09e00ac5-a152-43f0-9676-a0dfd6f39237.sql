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
WHERE email IN ('ADMIN_EMAIL_1', 'ADMIN_EMAIL_2');
