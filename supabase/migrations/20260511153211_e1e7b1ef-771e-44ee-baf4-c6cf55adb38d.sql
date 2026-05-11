UPDATE auth.users
SET encrypted_password = crypt('Maleta@2026#Secure', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email IN ('ovitoroliveira60@gmail.com', 'equipeanalisescia@gmail.com');