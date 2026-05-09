-- Garantir que client_permissions referencia profiles
ALTER TABLE public.client_permissions
  DROP CONSTRAINT IF EXISTS client_permissions_client_id_fkey,
  ADD CONSTRAINT client_permissions_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Garantir que custom_metrics referencia profiles
ALTER TABLE public.custom_metrics
  DROP CONSTRAINT IF EXISTS custom_metrics_user_id_fkey,
  ADD CONSTRAINT custom_metrics_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Garantir que user_roles referencia profiles
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
  ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
