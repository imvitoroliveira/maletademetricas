
CREATE TABLE public.vault_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'custom',
  subject_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt text NOT NULL DEFAULT '',
  image_data text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_documents TO authenticated;
GRANT ALL ON public.vault_documents TO service_role;

ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vault documents"
  ON public.vault_documents
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER vault_documents_updated_at
  BEFORE UPDATE ON public.vault_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX vault_documents_created_at_idx ON public.vault_documents (created_at DESC);
