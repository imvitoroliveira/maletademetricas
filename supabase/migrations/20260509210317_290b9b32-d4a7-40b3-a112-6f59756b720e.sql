DO $$
DECLARE
  manager_record RECORD;
BEGIN
  FOR manager_record IN
    SELECT id, email
    FROM auth.users
    WHERE lower(email) IN ('ADMIN_EMAIL_1', 'ADMIN_EMAIL_2')
  LOOP
    UPDATE auth.users
    SET
      aud = 'authenticated',
      role = 'authenticated',
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      updated_at = now()
    WHERE id = manager_record.id;

    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      manager_record.id::text,
      manager_record.id,
      jsonb_build_object(
        'sub', manager_record.id::text,
        'email', manager_record.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      identity_data = EXCLUDED.identity_data,
      updated_at = now();

    INSERT INTO public.profiles (id, email, is_active, is_admin)
    VALUES (manager_record.id, manager_record.email, true, true)
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      is_active = true,
      is_admin = true,
      updated_at = now();

    INSERT INTO public.user_roles (user_id, role)
    VALUES (manager_record.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;