
CREATE TABLE public.vault_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_notes TO authenticated;
GRANT ALL ON public.vault_notes TO service_role;

ALTER TABLE public.vault_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vault notes"
  ON public.vault_notes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER vault_notes_updated_at
  BEFORE UPDATE ON public.vault_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX vault_notes_created_at_idx ON public.vault_notes (created_at DESC);
