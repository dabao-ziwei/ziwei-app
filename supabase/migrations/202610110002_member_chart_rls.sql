-- Compatible with the currently deployed frontend; legacy welcome updates are guarded.
-- Scope: profiles, clients, relationships, their statistics view and definer entry points.
-- No existing member/chart rows are rewritten or deleted.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '198a5af8-ea33-42bd-b810-422216a935e0'
    AND lower(email) = 'stephenwu.0926@gmail.com') THEN
    RAISE EXCEPTION 'Owner identity mismatch; aborting RLS deployment';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_dabao_owner()
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT COALESCE(auth.uid() = '198a5af8-ea33-42bd-b810-422216a935e0'::uuid, false) $$;
REVOKE ALL ON FUNCTION public.is_dabao_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_dabao_owner() TO authenticated;

-- Old permissive policies combine with OR; retaining them would reopen access.
DO $$ DECLARE p record;
BEGIN
  FOR p IN SELECT * FROM pg_policies WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'clients', 'relationships') LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles, public.clients, public.relationships FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.clients, public.relationships TO authenticated;

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT public.is_dabao_owner()));
-- A row-level own-update policy would allow changing role, quotas, flags and expiry.
CREATE POLICY profiles_owner_write ON public.profiles FOR ALL TO authenticated
USING ((SELECT public.is_dabao_owner())) WITH CHECK ((SELECT public.is_dabao_owner()));

-- Compatibility for the deployed frontend's direct welcome-gift update.
-- This policy MUST stay coupled to the trigger below; it is not general self-edit access.
CREATE OR REPLACE FUNCTION public.guard_member_profile_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Trusted server functions run as their database owner, not authenticated/anon.
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_dabao_owner() THEN RETURN NEW; END IF;
  IF auth.uid() IS DISTINCT FROM OLD.id
    OR COALESCE(OLD.is_banned, false)
    OR COALESCE(OLD.has_claimed_welcome_gift, false)
    OR NEW.has_claimed_welcome_gift IS DISTINCT FROM true
    OR (to_jsonb(NEW) - ARRAY['access_expiry', 'has_claimed_welcome_gift'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['access_expiry', 'has_claimed_welcome_gift']) THEN
    RAISE EXCEPTION 'Profile permissions are owner-managed' USING ERRCODE = '42501';
  END IF;
  -- Never trust an expiry supplied by the browser. Exactly one seven-day gift.
  NEW.access_expiry := GREATEST(COALESCE(OLD.access_expiry, now()), now()) + interval '7 days';
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_member_profile_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_member_profile_update ON public.profiles;
CREATE TRIGGER guard_member_profile_update BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_member_profile_update();
CREATE POLICY profiles_legacy_gift_update ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY clients_access ON public.clients FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_dabao_owner()))
WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT public.is_dabao_owner()));

CREATE POLICY relationships_access ON public.relationships FOR ALL TO authenticated
USING ((SELECT public.is_dabao_owner()) OR (
  user_id = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = from_client_id AND c.user_id = (SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = to_client_id AND c.user_id = (SELECT auth.uid()))
))
WITH CHECK ((SELECT public.is_dabao_owner()) OR (
  user_id = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = from_client_id AND c.user_id = (SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = to_client_id AND c.user_id = (SELECT auth.uid()))
));

-- PostgreSQL 17: ensure the view uses the caller's RLS, not its creator's privileges.
ALTER VIEW public.user_statistics SET (security_invoker = true);
REVOKE ALL ON public.user_statistics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_statistics TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_welcome_gift()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE member public.profiles%ROWTYPE; caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign-in required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO member FROM public.profiles WHERE id = caller FOR UPDATE;
  IF NOT FOUND OR COALESCE(member.is_banned, false) OR COALESCE(member.has_claimed_welcome_gift, false) THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET
    access_expiry = GREATEST(COALESCE(member.access_expiry, now()), now()) + interval '7 days',
    has_claimed_welcome_gift = true WHERE id = caller;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_welcome_gift() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_welcome_gift() TO authenticated;

-- Preserve audited business bodies; prepend authorization to definer RPCs.
-- Marker makes reapplication idempotent. Unexpected language/body aborts the transaction.
DO $$
DECLARE f record; definition text; guard text;
BEGIN
  FOR f IN SELECT p.oid, p.proname, p.oid::regprocedure AS signature, l.lanname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public' AND p.proname IN (
      'admin_add_credits', 'admin_adjust_points', 'admin_bulk_update_max_charts',
      'admin_update_feature_runtime', 'get_db_schema_export', 'simulate_payment_success',
      'deduct_points_for_divination'
    ) LOOP
    definition := pg_get_functiondef(f.oid);
    IF f.lanname <> 'plpgsql' OR definition !~* '\mBEGIN\M' THEN
      RAISE EXCEPTION 'Unexpected RPC definition: %', f.signature;
    END IF;
    IF position('dabao_rls_guard_v1' IN definition) = 0 THEN
      IF f.proname = 'deduct_points_for_divination' THEN
        -- Authorization/input validation only; do not change divination calculation.
        guard := E'BEGIN\n /* dabao_rls_guard_v1 */\n IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.is_dabao_owner()) OR p_cost IS NULL OR p_cost < 0 THEN RAISE EXCEPTION ''Unauthorized deduction'' USING ERRCODE = ''42501''; END IF;\n';
      ELSE
        guard := E'BEGIN\n /* dabao_rls_guard_v1 */\n IF NOT public.is_dabao_owner() THEN RAISE EXCEPTION ''Owner only'' USING ERRCODE = ''42501''; END IF;\n';
        IF f.proname = 'admin_adjust_points' THEN
          guard := guard || E' IF p_admin_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION ''Invalid actor'' USING ERRCODE = ''42501''; END IF;\n';
        END IF;
      END IF;
      EXECUTE regexp_replace(definition, '\mBEGIN\M', guard, 'i');
    END IF;
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.signature);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
