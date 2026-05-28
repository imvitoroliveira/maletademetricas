-- Gerar uma nova senha aleatória baseada em UUID para os administradores
DO $$
DECLARE
    new_password TEXT := gen_random_uuid()::text;
BEGIN
    -- Atualizar a senha para o primeiro admin
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE email = 'ovitoroliveira60@gmail.com';
    
    RAISE NOTICE 'New password for ovitoroliveira60@gmail.com is: %', new_password;

    -- Gerar outra senha para o segundo admin
    new_password := gen_random_uuid()::text;
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE email = 'equipeanalisescia@gmail.com';
    
    RAISE NOTICE 'New password for equipeanalisescia@gmail.com is: %', new_password;
END $$;
