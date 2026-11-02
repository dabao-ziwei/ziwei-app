-- Local implementation only: back up current policies/functions before production application.
BEGIN;
CREATE TABLE public.password_reset_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reset_id uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('issuing','required','changing','complete')),
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  session_valid_after timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_until timestamptz NOT NULL,
  temporary_hash text,
  issued_by uuid NOT NULL REFERENCES auth.users(id)
);
CREATE TABLE public.password_reset_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  reset_id uuid NOT NULL,
  event text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.password_reset_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.password_reset_state, public.password_reset_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.password_reset_state, public.password_reset_audit TO service_role;
GRANT USAGE ON SEQUENCE public.password_reset_audit_id_seq TO service_role;

-- Session creation time, not JWT iat: refreshing an old session must not restore access.
CREATE FUNCTION public.password_reset_session_allowed() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.password_reset_state r WHERE r.user_id = auth.uid()
    AND (r.state <> 'complete' OR NOT EXISTS (
      SELECT 1 FROM auth.sessions s WHERE s.id::text = auth.jwt()->>'session_id'
        AND s.user_id = auth.uid() AND s.created_at > r.session_valid_after
    ))
  )
$$;
REVOKE ALL ON FUNCTION public.password_reset_session_allowed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.password_reset_session_allowed() TO authenticated, service_role;

CREATE FUNCTION public.password_reset_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE r public.password_reset_state; fresh boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM public.password_reset_state WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('state','normal'); END IF;
  SELECT EXISTS (SELECT 1 FROM auth.sessions s WHERE s.id::text = auth.jwt()->>'session_id'
    AND s.user_id = auth.uid() AND s.created_at > r.session_valid_after) INTO fresh;
  RETURN jsonb_build_object('state',r.state,'reset_id',r.reset_id,'expires_at',r.expires_at,
    'expired',r.expires_at <= clock_timestamp(),'fresh_session',fresh);
END $$;
REVOKE ALL ON FUNCTION public.password_reset_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.password_reset_status() TO authenticated;

-- Only the trusted backend can mutate this state. Row locks serialize issuance/completion.
CREATE FUNCTION public.password_reset_transition(p_user uuid, p_reset uuid, p_action text,
  p_hash text DEFAULT NULL, p_actor uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE r public.password_reset_state; stamp timestamptz := clock_timestamp();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  SELECT * INTO r FROM public.password_reset_state WHERE user_id = p_user FOR UPDATE;
  IF p_action = 'issue' THEN
    IF p_actor IS DISTINCT FROM '198a5af8-ea33-42bd-b810-422216a935e0'::uuid
      OR p_user = p_actor OR p_hash IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
    IF r.user_id IS NOT NULL AND (r.issued_at > stamp - interval '1 minute'
      OR (r.state IN ('issuing','changing') AND r.lease_until > stamp)) THEN
      RAISE EXCEPTION 'reset busy; retry later';
    END IF;
    INSERT INTO public.password_reset_state VALUES
      (p_user,p_reset,'issuing',stamp,stamp+interval '24 hours',stamp,stamp+interval '2 minutes',p_hash,p_actor)
    ON CONFLICT (user_id) DO UPDATE SET reset_id=EXCLUDED.reset_id,state=EXCLUDED.state,
      issued_at=EXCLUDED.issued_at,expires_at=EXCLUDED.expires_at,session_valid_after=EXCLUDED.session_valid_after,
      lease_until=EXCLUDED.lease_until,temporary_hash=EXCLUDED.temporary_hash,issued_by=EXCLUDED.issued_by;
  ELSE
    IF r.reset_id IS DISTINCT FROM p_reset THEN RAISE EXCEPTION 'reset changed; reload'; END IF;
    IF p_action = 'ready' AND r.state = 'issuing' THEN
      UPDATE public.password_reset_state SET state='required',session_valid_after=stamp WHERE user_id=p_user;
    ELSIF p_action = 'claim' AND r.state='required' AND r.expires_at > stamp THEN
      UPDATE public.password_reset_state SET state='changing',lease_until=stamp+interval '2 minutes' WHERE user_id=p_user;
    ELSIF p_action = 'retry' AND r.state='changing' THEN
      UPDATE public.password_reset_state SET state='required' WHERE user_id=p_user;
    ELSIF p_action = 'complete' AND r.state='changing' THEN
      UPDATE public.password_reset_state SET state='complete',temporary_hash=NULL,session_valid_after=stamp WHERE user_id=p_user;
    ELSE RAISE EXCEPTION 'invalid or expired reset'; END IF;
  END IF;
  INSERT INTO public.password_reset_audit(user_id,reset_id,event) VALUES(p_user,p_reset,p_action);
END $$;
REVOKE ALL ON FUNCTION public.password_reset_transition(uuid,uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.password_reset_transition(uuid,uuid,text,text,uuid) TO service_role;

-- Preserve existing access; add a restrictive session gate to application tables.
-- Public/guest workflows remain unchanged. No customer rows are rewritten.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
      AND c.relname NOT IN ('password_reset_state','password_reset_audit') LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I',t.relname)::regclass) THEN
      -- Tables previously without RLS retain their existing grant-based access for normal users/guests.
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.relname);
      EXECUTE format('CREATE POLICY credential_previous_grants ON public.%I FOR ALL TO PUBLIC USING (true) WITH CHECK (true)',t.relname);
    END IF;
    EXECUTE format('CREATE POLICY credential_session_gate ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.password_reset_session_allowed()) WITH CHECK (public.password_reset_session_allowed())',t.relname);
    EXECUTE format('REVOKE TRUNCATE ON public.%I FROM PUBLIC, anon, authenticated',t.relname);
  END LOOP;
END $$;

-- SECURITY DEFINER member RPCs bypass table RLS: prepend a gate without changing their logic.
DO $$ DECLARE f record; definition text; BEGIN
  FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_language l ON l.oid=p.prolang
    WHERE n.nspname='public' AND l.lanname='plpgsql' AND p.prosecdef
      AND p.prorettype NOT IN ('trigger'::regtype,'event_trigger'::regtype)
      AND p.proname NOT LIKE 'password_reset_%' LOOP
    definition := pg_get_functiondef(f.oid);
    IF definition !~* '\mBEGIN\M' THEN RAISE EXCEPTION 'Cannot guard function %',f.oid::regprocedure; END IF;
    definition := regexp_replace(definition,'\mBEGIN\M',
      E'BEGIN\n /* credential_session_guard_v1 */\n IF auth.uid() IS NOT NULL AND NOT public.password_reset_session_allowed() THEN RAISE EXCEPTION ''password change and fresh login required'' USING ERRCODE=''42501''; END IF;', 'i');
    EXECUTE definition;
  END LOOP;
END $$;
COMMIT;
