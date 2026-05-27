-- Reset admin passwords to a known temporary value
UPDATE auth.users 
SET encrypted_password = crypt('Maleta@2026#Secure', gen_salt('bf'))
WHERE email IN ('ADMIN_EMAIL_1', 'ADMIN_EMAIL_2');