-- Update the handle_new_user function to include the new manager email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, is_admin, is_active)
    VALUES (
        NEW.id, 
        NEW.email, 
        (NEW.email = 'ovitoroliveira60@gmail.com' OR NEW.email = 'equipeanalisescia@gmail.com'),
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        is_admin = (EXCLUDED.email = 'ovitoroliveira60@gmail.com' OR EXCLUDED.email = 'equipeanalisescia@gmail.com');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update existing profiles just in case
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'equipeanalisescia@gmail.com';
