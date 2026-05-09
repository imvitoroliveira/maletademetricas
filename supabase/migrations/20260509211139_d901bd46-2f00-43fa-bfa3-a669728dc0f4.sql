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
