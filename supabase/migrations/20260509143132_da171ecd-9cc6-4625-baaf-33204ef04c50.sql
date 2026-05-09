-- Atualizar a senha do usuário ovitoroliveira60@gmail.com
UPDATE auth.users 
SET encrypted_password = crypt('1864481', gen_salt('bf'))
WHERE email = 'ovitoroliveira60@gmail.com';

-- Garantir que o perfil dele está ativo e é admin
UPDATE public.profiles
SET is_active = true, is_admin = true
WHERE email = 'ovitoroliveira60@gmail.com';
