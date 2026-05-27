-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, is_admin, is_active)
    VALUES (
        NEW.id, 
        NEW.email, 
        (NEW.email = 'ADMIN_EMAIL_1'),
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        is_admin = (EXCLUDED.email = 'ADMIN_EMAIL_1');
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
WHERE email = 'ADMIN_EMAIL_1';
