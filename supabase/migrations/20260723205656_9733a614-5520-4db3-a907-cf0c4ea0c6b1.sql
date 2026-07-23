
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reels_max_channels INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS reels_max_runs_per_day INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS reels_generation_enabled BOOLEAN NOT NULL DEFAULT true;

-- Only admins may change quota columns (client cannot self-raise).
REVOKE UPDATE (reels_max_channels, reels_max_runs_per_day, reels_generation_enabled)
  ON public.profiles FROM authenticated;

-- Daily usage counter, one row per (user, day)
CREATE TABLE IF NOT EXISTS public.reels_daily_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  runs INTEGER NOT NULL DEFAULT 0,
  scripts_created INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, run_date)
);

GRANT SELECT ON public.reels_daily_usage TO authenticated;
GRANT ALL ON public.reels_daily_usage TO service_role;

ALTER TABLE public.reels_daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own reels usage" ON public.reels_daily_usage;
CREATE POLICY "Users read own reels usage"
ON public.reels_daily_usage FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Atomically consume one daily run.
-- Returns the new "runs" value on success, or NULL when denied
-- (disabled, cap <= 0, or daily cap already reached).
CREATE OR REPLACE FUNCTION public.try_consume_reels_run(_user_id uuid)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap INTEGER;
  enabled BOOLEAN;
  new_runs INTEGER;
BEGIN
  -- Callers may only consume runs for themselves; service_role bypasses (auth.uid() is null).
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT reels_max_runs_per_day, reels_generation_enabled
    INTO cap, enabled
    FROM public.profiles WHERE id = _user_id;

  IF NOT COALESCE(enabled, false) OR COALESCE(cap, 0) <= 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.reels_daily_usage AS u (user_id, run_date, runs)
    VALUES (_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, run_date) DO UPDATE
    SET runs = u.runs + 1, updated_at = now()
    WHERE u.runs < cap
  RETURNING runs INTO new_runs;

  RETURN new_runs;
END;
$$;

REVOKE ALL ON FUNCTION public.try_consume_reels_run(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.try_consume_reels_run(uuid) TO authenticated, service_role;

-- Record N scripts produced during a run (accumulates into today's row).
CREATE OR REPLACE FUNCTION public.record_reels_generation(_user_id uuid, _scripts_created integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  INSERT INTO public.reels_daily_usage AS u (user_id, run_date, scripts_created)
    VALUES (_user_id, CURRENT_DATE, GREATEST(_scripts_created, 0))
  ON CONFLICT (user_id, run_date) DO UPDATE
    SET scripts_created = u.scripts_created + GREATEST(_scripts_created, 0),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_reels_generation(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_reels_generation(uuid, integer) TO authenticated, service_role;
