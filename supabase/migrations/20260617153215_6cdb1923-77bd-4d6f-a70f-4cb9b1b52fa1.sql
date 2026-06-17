-- Reference YouTube channels per user
CREATE TABLE public.reels_reference_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_input TEXT NOT NULL,
  channel_id TEXT,
  channel_name TEXT,
  channel_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reels_reference_channels TO authenticated;
GRANT ALL ON public.reels_reference_channels TO service_role;

ALTER TABLE public.reels_reference_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own reference channels"
ON public.reels_reference_channels FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Generated reels scripts
CREATE TABLE public.reels_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.reels_reference_channels(id) ON DELETE SET NULL,
  source_video_id TEXT,
  source_video_title TEXT,
  source_video_url TEXT,
  source_channel_name TEXT,
  source_views BIGINT,
  theme TEXT,
  title TEXT NOT NULL,
  hook TEXT,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta TEXT,
  caption TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reels_scripts TO authenticated;
GRANT ALL ON public.reels_scripts TO service_role;

ALTER TABLE public.reels_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own reels scripts"
ON public.reels_scripts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Prevent duplicate scripts from the same source video per user
CREATE UNIQUE INDEX reels_scripts_user_video_unique
ON public.reels_scripts (user_id, source_video_id)
WHERE source_video_id IS NOT NULL;

CREATE INDEX reels_scripts_user_created_idx
ON public.reels_scripts (user_id, created_at DESC);

-- updated_at triggers
CREATE TRIGGER update_reels_reference_channels_updated_at
BEFORE UPDATE ON public.reels_reference_channels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reels_scripts_updated_at
BEFORE UPDATE ON public.reels_scripts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();