-- =========================================================
-- AI Conversations
-- =========================================================
CREATE TABLE public.ai_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations"
ON public.ai_conversations FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ai_conversations_updated_at
BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- AI Messages
-- =========================================================
CREATE TABLE public.ai_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL DEFAULT '',
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage messages in own conversations"
ON public.ai_messages FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ai_conversations c
  WHERE c.id = conversation_id AND c.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ai_conversations c
  WHERE c.id = conversation_id AND c.user_id = auth.uid()
));

-- =========================================================
-- AI Provider Keys (rotation pool) - admin only
-- =========================================================
CREATE TABLE public.ai_provider_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google')),
  api_key text NOT NULL,
  model text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_provider_keys TO authenticated;
GRANT ALL ON public.ai_provider_keys TO service_role;

ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active admins manage provider keys"
ON public.ai_provider_keys FOR ALL TO authenticated
USING (private.is_admin() AND private.is_active_user(auth.uid()))
WITH CHECK (private.is_admin() AND private.is_active_user(auth.uid()));

CREATE TRIGGER update_ai_provider_keys_updated_at
BEFORE UPDATE ON public.ai_provider_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();