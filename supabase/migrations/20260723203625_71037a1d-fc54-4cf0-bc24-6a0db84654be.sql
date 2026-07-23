-- 1) Extensão de criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2) Cofre de chaves interno (schema private ja existe pelas migrations anteriores)
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  name  text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON private.app_secrets FROM PUBLIC, anon, authenticated;

-- Gera a chave de criptografia UMA vez. Se ja existir, mantem.
INSERT INTO private.app_secrets (name, value)
VALUES ('meta_encryption_key', encode(gen_random_bytes(32), 'base64'))
ON CONFLICT (name) DO NOTHING;

-- 3) Helpers SECURITY DEFINER para cifrar/decifrar
CREATE OR REPLACE FUNCTION private.meta_enc(plaintext text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE k text;
BEGIN
  IF plaintext IS NULL OR length(plaintext) = 0 THEN RETURN NULL; END IF;
  SELECT value INTO k FROM private.app_secrets WHERE name = 'meta_encryption_key';
  IF k IS NULL THEN RAISE EXCEPTION 'meta_encryption_key ausente'; END IF;
  RETURN pgp_sym_encrypt(plaintext, k, 'cipher-algo=aes256');
END;
$$;

CREATE OR REPLACE FUNCTION private.meta_dec(ciphertext bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE k text;
BEGIN
  IF ciphertext IS NULL THEN RETURN NULL; END IF;
  SELECT value INTO k FROM private.app_secrets WHERE name = 'meta_encryption_key';
  RETURN pgp_sym_decrypt(ciphertext, k);
END;
$$;

REVOKE ALL ON FUNCTION private.meta_enc(text)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.meta_dec(bytea)  FROM PUBLIC, anon, authenticated;

-- 4) Novas colunas cifradas + indicador booleano seguro para a UI
ALTER TABLE public.ad_accounts
  ADD COLUMN IF NOT EXISTS access_token_encrypted bytea,
  ADD COLUMN IF NOT EXISTS app_secret_encrypted   bytea;

-- Backfill (roda com privilegio da migration; texto claro entra na chamada da funcao SECURITY DEFINER)
UPDATE public.ad_accounts
   SET access_token_encrypted = private.meta_enc(access_token)
 WHERE access_token IS NOT NULL
   AND access_token_encrypted IS NULL;

UPDATE public.ad_accounts
   SET app_secret_encrypted = private.meta_enc(app_secret)
 WHERE app_secret IS NOT NULL
   AND app_secret_encrypted IS NULL;

-- Coluna gerada para expor "tem credencial?" sem vazar o token
ALTER TABLE public.ad_accounts
  ADD COLUMN IF NOT EXISTS has_credentials boolean
  GENERATED ALWAYS AS (access_token_encrypted IS NOT NULL) STORED;

-- 5) Elimina definitivamente o texto claro do banco
ALTER TABLE public.ad_accounts DROP COLUMN IF EXISTS access_token;
ALTER TABLE public.ad_accounts DROP COLUMN IF EXISTS app_secret;

-- 6) Bloqueia leitura direta das colunas cifradas pela Data API
REVOKE SELECT (access_token_encrypted, app_secret_encrypted) ON public.ad_accounts FROM authenticated;
REVOKE SELECT (access_token_encrypted, app_secret_encrypted) ON public.ad_accounts FROM anon;

-- 7) RPC de escrita: admin autenticado envia texto claro, servidor cifra
CREATE OR REPLACE FUNCTION public.create_ad_account(
  p_name         text,
  p_account_id   text,
  p_access_token text,
  p_platform     text DEFAULT 'meta',
  p_software     text DEFAULT NULL,
  p_birth_date   date DEFAULT NULL,
  p_status       text DEFAULT 'active',
  p_app_secret   text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;

  INSERT INTO public.ad_accounts (
    name, account_id, platform, software, birth_date, status,
    access_token_encrypted, app_secret_encrypted
  ) VALUES (
    p_name, p_account_id, COALESCE(p_platform,'meta'), p_software, p_birth_date, COALESCE(p_status,'active'),
    private.meta_enc(p_access_token),
    private.meta_enc(p_app_secret)
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ad_account_credentials(
  p_id           uuid,
  p_access_token text DEFAULT NULL,
  p_app_secret   text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;

  UPDATE public.ad_accounts SET
    access_token_encrypted = CASE WHEN p_access_token IS NOT NULL AND length(p_access_token) > 0
                                  THEN private.meta_enc(p_access_token)
                                  ELSE access_token_encrypted END,
    app_secret_encrypted   = CASE WHEN p_app_secret   IS NOT NULL AND length(p_app_secret) > 0
                                  THEN private.meta_enc(p_app_secret)
                                  ELSE app_secret_encrypted END,
    updated_at = now()
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_ad_account(text,text,text,text,text,date,text,text)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_ad_account_credentials(uuid,text,text)                    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_ad_account(text,text,text,text,text,date,text,text)   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.update_ad_account_credentials(uuid,text,text)                TO authenticated;

-- 8) RPC de leitura para as edge functions (rodam como service_role)
CREATE OR REPLACE FUNCTION public.get_ad_account_secret(p_id uuid)
RETURNS TABLE(access_token text, app_secret text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  RETURN QUERY
  SELECT private.meta_dec(a.access_token_encrypted),
         private.meta_dec(a.app_secret_encrypted)
    FROM public.ad_accounts a
   WHERE a.id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ad_account_secret(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_ad_account_secret(uuid) TO service_role;