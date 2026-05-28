-- Update policies for the profiles table
DROP POLICY IF EXISTS "Profiles: view own" ON public.profiles;
CREATE POLICY "Profiles: view own" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id 
        AND private.is_active_user(auth.uid())
    );

DROP POLICY IF EXISTS "Profiles: admin view all" ON public.profiles;
CREATE POLICY "Profiles: admin view all" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        private.is_admin() 
        AND private.is_active_user(auth.uid())
    );

DROP POLICY IF EXISTS "Profiles: admin update all" ON public.profiles;
CREATE POLICY "Profiles: admin update all" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        private.is_admin() 
        AND private.is_active_user(auth.uid())
    )
    WITH CHECK (
        private.is_admin() 
        AND private.is_active_user(auth.uid())
    );

-- Update policies for user_roles table to be more explicit
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
        private.is_admin() 
        AND private.is_active_user(auth.uid())
    );

-- Note: Other policies for user_roles, custom_metrics, and client_permissions 
-- already include the is_active_user check or use is_admin() which calls it.
-- I'm making these explicit to ensure no bypass is possible and for consistency.
