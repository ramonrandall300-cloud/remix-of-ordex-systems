
-- Table to track active sessions (one allowed per user)
CREATE TABLE public.user_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  device_info text,
  ip_address text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own session
CREATE POLICY "users_select_own_session" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own session
CREATE POLICY "users_insert_own_session" ON public.user_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own session
CREATE POLICY "users_update_own_session" ON public.user_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own session  
CREATE POLICY "users_delete_own_session" ON public.user_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Function to register/update session (upsert)
CREATE OR REPLACE FUNCTION public.register_session(_session_id text, _device_info text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _old_session text;
BEGIN
  -- Get existing session if any
  SELECT session_id INTO _old_session
  FROM public.user_sessions
  WHERE user_id = _uid;

  -- Upsert the session
  INSERT INTO public.user_sessions (user_id, session_id, device_info, last_seen_at)
  VALUES (_uid, _session_id, _device_info, now())
  ON CONFLICT (user_id) DO UPDATE
  SET session_id = EXCLUDED.session_id,
      device_info = EXCLUDED.device_info,
      last_seen_at = now(),
      started_at = now();

  RETURN jsonb_build_object('registered', true, 'replaced', _old_session IS NOT NULL AND _old_session != _session_id);
END;
$$;

-- Function to validate current session is still active
CREATE OR REPLACE FUNCTION public.validate_session(_session_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_sessions
    WHERE user_id = auth.uid() AND session_id = _session_id
  );
$$;
