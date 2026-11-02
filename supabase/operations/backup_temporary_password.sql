-- READ ONLY. Run BEFORE 202611010001. Save restore_sql outside Git; verify it before migration.
DO $$ BEGIN
  IF to_regclass('public.password_reset_state') IS NOT NULL THEN
    RAISE EXCEPTION 'Already migrated: obtain a new full schema snapshot instead';
  END IF;
END $$;
WITH tables AS (
  SELECT c.* FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
), functions AS (
  SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_language l ON l.oid=p.prolang
  WHERE n.nspname='public' AND l.lanname='plpgsql' AND p.prosecdef
    AND p.prorettype NOT IN ('trigger'::regtype,'event_trigger'::regtype)
    AND p.proname NOT LIKE 'password_reset_%'
), truncate_grants AS (
  SELECT c.relname, CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END recipient,
    a.is_grantable FROM tables c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
    WHERE a.privilege_type='TRUNCATE' AND (a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated'))
)
SELECT E'-- WARNING: rollback removes forced-password data access enforcement. Obtain approval.\nBEGIN;\n'
  || COALESCE((SELECT string_agg(format(E'DROP POLICY IF EXISTS credential_session_gate ON public.%I;\nDROP POLICY IF EXISTS credential_previous_grants ON public.%I;\nALTER TABLE public.%I %s ROW LEVEL SECURITY;',
    relname,relname,relname,CASE WHEN relrowsecurity THEN 'ENABLE' ELSE 'DISABLE' END),E'\n') FROM tables),'')
  || E'\n' || COALESCE((SELECT string_agg(pg_get_functiondef(oid)||';',E'\n') FROM functions),'')
  || E'\n' || COALESCE((SELECT string_agg(format('GRANT TRUNCATE ON public.%I TO %s%s;',relname,recipient,
    CASE WHEN is_grantable THEN ' WITH GRANT OPTION' ELSE '' END),E'\n') FROM truncate_grants),'')
  || E'\n-- Keep private reset/audit tables for investigation; never erase issued credentials or audit history.\nCOMMIT;\n'
  AS restore_sql;
