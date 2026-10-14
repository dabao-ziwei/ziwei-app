-- READ ONLY: result is an executable rollback snapshot, not business-data backup.
-- Specifically for the first 202610110002 deployment; refuse later states.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('is_dabao_owner','guard_member_profile_update','claim_welcome_gift'))
    OR EXISTS (SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid='public.profiles'::regclass)
    OR EXISTS (SELECT 1 FROM pg_class WHERE oid='public.user_statistics'::regclass AND reloptions IS NOT NULL) THEN
    RAISE EXCEPTION 'Not the initial deployment state. Use a new full snapshot instead of this first-deployment generator.';
  END IF;
END $$;
WITH relations AS (
  SELECT c.* FROM pg_class c WHERE c.oid IN ('public.profiles'::regclass,
    'public.clients'::regclass,'public.relationships'::regclass,'public.user_statistics'::regclass)
), functions AS (
  SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('admin_add_credits','admin_adjust_points',
    'admin_bulk_update_max_charts','admin_update_feature_runtime','get_db_schema_export',
    'simulate_payment_success','deduct_points_for_divination')
), relation_grants AS (
  SELECT c.relname, CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END AS recipient,
    a.is_grantable, string_agg(a.privilege_type, ', ' ORDER BY a.privilege_type) AS privileges
  FROM relations c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
  GROUP BY c.relname,a.grantee,a.is_grantable
), function_grants AS (
  SELECT p.oid::regprocedure::text AS signature,
    CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END AS recipient,
    a.is_grantable, string_agg(a.privilege_type, ', ' ORDER BY a.privilege_type) AS privileges
  FROM functions p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  GROUP BY p.oid,a.grantee,a.is_grantable
)
SELECT
  '-- RLS rollback snapshot: desfvqlxyxharknnjvzi / ' || now()::text || E'\n' ||
  E'-- WARNING: restores previous, less restrictive security. Obtain approval before running.\nBEGIN;\n' ||
  E'DO $$ DECLARE p record; BEGIN FOR p IN SELECT * FROM pg_policies WHERE schemaname=''public'' AND tablename IN (''profiles'',''clients'',''relationships'') LOOP EXECUTE format(''DROP POLICY %I ON public.%I'',p.policyname,p.tablename); END LOOP; END $$;\n' ||
  E'DROP TRIGGER IF EXISTS guard_member_profile_update ON public.profiles;\n' ||
  (SELECT string_agg(format('ALTER TABLE public.%I %s ROW LEVEL SECURITY;%sALTER TABLE public.%I %s FORCE ROW LEVEL SECURITY;',
    relname,CASE WHEN relrowsecurity THEN 'ENABLE' ELSE 'DISABLE' END,E'\n',relname,
    CASE WHEN relforcerowsecurity THEN '' ELSE 'NO' END), E'\n' ORDER BY relname) FROM relations WHERE relkind='r') || E'\n' ||
  (SELECT string_agg(format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',policyname,schemaname,tablename,
    permissive,cmd,(SELECT string_agg(CASE WHEN r='public' THEN 'PUBLIC' ELSE quote_ident(r) END, ', ') FROM unnest(roles) r),
    CASE WHEN qual IS NULL THEN '' ELSE ' USING ('||qual||')' END,
    CASE WHEN with_check IS NULL THEN '' ELSE ' WITH CHECK ('||with_check||')' END), E'\n' ORDER BY tablename,policyname)
    FROM pg_policies WHERE schemaname='public' AND tablename IN ('profiles','clients','relationships')) || E'\n' ||
  E'ALTER VIEW public.user_statistics RESET (security_invoker);\n' ||
  (SELECT string_agg(format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, service_role, postgres;',relname), E'\n' ORDER BY relname) FROM relations) || E'\n' ||
  (SELECT string_agg(format('GRANT %s ON public.%I TO %s%s;',privileges,relname,recipient,
    CASE WHEN is_grantable THEN ' WITH GRANT OPTION' ELSE '' END),E'\n' ORDER BY relname,recipient) FROM relation_grants) || E'\n' ||
  (SELECT string_agg(format('ALTER FUNCTION public.%s RESET ALL;%s%s;',p.oid::regprocedure::text,E'\n',pg_get_functiondef(p.oid)),E'\n' ORDER BY proname) FROM functions p) || E'\n' ||
  (SELECT string_agg(format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated, service_role, postgres;',p.oid::regprocedure::text),E'\n' ORDER BY proname) FROM functions p) || E'\n' ||
  (SELECT string_agg(format('GRANT %s ON FUNCTION public.%s TO %s%s;',privileges,signature,recipient,
    CASE WHEN is_grantable THEN ' WITH GRANT OPTION' ELSE '' END),E'\n' ORDER BY signature,recipient) FROM function_grants) || E'\n' ||
  E'DROP FUNCTION IF EXISTS public.claim_welcome_gift();\nDROP FUNCTION IF EXISTS public.guard_member_profile_update();\nDROP FUNCTION IF EXISTS public.is_dabao_owner();\nNOTIFY pgrst, ''reload schema'';\nCOMMIT;\n'
  AS restore_sql;
