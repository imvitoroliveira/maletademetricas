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
    'equipeanalisescia@gmail.com', 
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
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'equipeanalisescia@gmail.com');

-- Create profiles for the managers
INSERT INTO public.profiles (id, email, is_admin, is_active)
SELECT id, email, true, true
FROM auth.users
WHERE email IN ('ovitoroliveira60@gmail.com', 'equipeanalisescia@gmail.com')
ON CONFLICT (id) DO UPDATE SET is_admin = true, is_active = true;
