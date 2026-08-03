-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS cor_tema text NOT NULL DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'conjuge';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','conjuge'));

-- 2. accounts
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('corrente','poupanca','cartao','dinheiro','investimento')),
  saldo_atual numeric NOT NULL DEFAULT 0,
  cor text NOT NULL DEFAULT '#3B82F6',
  icone text NOT NULL DEFAULT '💳',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own accounts" ON public.accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita','despesa')),
  cor text NOT NULL DEFAULT '#6B7280',
  icone text NOT NULL DEFAULT '📦',
  orcamento_mensal numeric,
  essencial boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own categories" ON public.categories FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita','despesa','transferencia')),
  valor numeric NOT NULL CHECK (valor > 0),
  data date NOT NULL DEFAULT CURRENT_DATE,
  descricao text,
  responsavel text NOT NULL DEFAULT 'eu' CHECK (responsavel IN ('eu','conjuge','ambos')),
  comprovante_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_transactions_user_data ON public.transactions(user_id, data DESC);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);

-- 5. budgets
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  limite numeric NOT NULL DEFAULT 0,
  alerta_80_enviado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, mes, ano)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budgets" ON public.budgets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Seed defaults function
CREATE OR REPLACE FUNCTION public.seed_finance_defaults(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.categories (user_id, nome, tipo, cor, icone, essencial)
  SELECT _user_id, v.nome, v.tipo, v.cor, v.icone, v.essencial
  FROM (VALUES
    ('Casa','despesa','#EF4444','🏠',true),
    ('Mercado','despesa','#F59E0B','🛒',true),
    ('Criancas','despesa','#EC4899','🧸',true),
    ('Criancas-Imprevisto','despesa','#F97316','🚨',false),
    ('Transporte','despesa','#3B82F6','🚗',true),
    ('Saude','despesa','#EF4444','❤️',true),
    ('Lazer','despesa','#8B5CF6','🎈',false),
    ('Educacao','despesa','#10B981','📚',true),
    ('Outros','despesa','#6B7280','📦',false),
    ('Salario','receita','#10B981','💰',true),
    ('Outras-Receitas','receita','#34D399','💵',true)
  ) AS v(nome,tipo,cor,icone,essencial)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c WHERE c.user_id = _user_id AND c.nome = v.nome
  );

  INSERT INTO public.accounts (user_id, nome, tipo, cor, icone)
  SELECT _user_id, v.nome, v.tipo, v.cor, v.icone
  FROM (VALUES
    ('Conta Principal','corrente','#3B82F6','💳'),
    ('Dinheiro Vivo','dinheiro','#10B981','💵'),
    ('Cartao de Credito','cartao','#F59E0B','💳')
  ) AS v(nome,tipo,cor,icone)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts a WHERE a.user_id = _user_id AND a.nome = v.nome
  );
END;
$$;

-- 7. Seed for existing users
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.seed_finance_defaults(r.id);
  END LOOP;
END $$;

-- 8. Seed automatically for new users
CREATE OR REPLACE FUNCTION public.seed_finance_defaults_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.seed_finance_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_finance_defaults_trg ON public.profiles;
CREATE TRIGGER seed_finance_defaults_trg
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.seed_finance_defaults_on_profile();