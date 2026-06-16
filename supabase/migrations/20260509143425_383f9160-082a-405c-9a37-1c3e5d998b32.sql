UPDATE auth.users 
SET encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf', 10))
WHERE email = 'ADMIN_EMAIL_1';
