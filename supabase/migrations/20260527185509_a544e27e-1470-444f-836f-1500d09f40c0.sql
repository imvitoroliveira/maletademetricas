-- Atualizar as senhas dos administradores para um hash seguro gerado pelo Supabase
-- Estamos usando o hash de uma senha aleatória forte para invalidar a senha '1864481'
-- O usuário deve usar a recuperação de senha ou o admin deve resetar via dashboard do Supabase

UPDATE auth.users 
SET encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
WHERE email IN ('ovitoroliveira60@gmail.com', 'equipeanalisescia@gmail.com');
