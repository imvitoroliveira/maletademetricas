-- Reset admin passwords to a known temporary value
UPDATE auth.users 
SET encrypted_password = crypt('Maleta@2026#Secure', gen_salt('bf'))
WHERE email IN ('ovitoroliveira60@gmail.com', 'equipeanalisescia@gmail.com');