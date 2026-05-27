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
