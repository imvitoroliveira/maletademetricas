-- Atualizar a senha do usuário ADMIN_EMAIL_1
UPDATE auth.users 
SET encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
WHERE email = 'ADMIN_EMAIL_1';

-- Garantir que o perfil dele está ativo e é admin
UPDATE public.profiles
SET is_active = true, is_admin = true
WHERE email = 'ADMIN_EMAIL_1';
