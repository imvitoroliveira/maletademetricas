DROP TRIGGER IF EXISTS update_ai_provider_keys_updated_at ON public.ai_provider_keys;
DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON public.ai_conversations;

DROP TABLE IF EXISTS public.ai_provider_keys;
DROP TABLE IF EXISTS public.ai_messages;
DROP TABLE IF EXISTS public.ai_conversations;