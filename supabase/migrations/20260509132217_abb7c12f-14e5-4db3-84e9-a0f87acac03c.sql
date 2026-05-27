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
    VALUES (NEW.id, NEW.email, (NEW.email = 'ADMIN_EMAIL_1'));
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
