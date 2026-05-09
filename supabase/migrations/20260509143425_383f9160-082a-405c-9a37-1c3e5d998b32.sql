UPDATE auth.users 
SET encrypted_password = crypt('1864481', gen_salt('bf', 10))
WHERE email = 'ovitoroliveira60@gmail.com';
