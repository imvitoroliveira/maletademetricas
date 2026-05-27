UPDATE auth.users 
SET encrypted_password = crypt('REDACTED_EXPOSED_PASSWORD', gen_salt('bf', 10))
WHERE email = 'ADMIN_EMAIL_1';
