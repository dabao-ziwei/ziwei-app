-- Read-only production smoke check. No chart/member/financial records are updated.
BEGIN READ ONLY;
SELECT set_config('request.jwt.claim.sub','198a5af8-ea33-42bd-b810-422216a935e0',true);
SELECT set_config('request.jwt.claims','{"sub":"198a5af8-ea33-42bd-b810-422216a935e0","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT public.is_dabao_owner() THEN RAISE EXCEPTION 'Owner identification failed'; END IF;
  IF (SELECT count(*) FROM public.profiles) <> 152 OR (SELECT count(*) FROM public.clients) <> 638
    OR (SELECT count(*) FROM public.relationships) <> 151 THEN
    RAISE EXCEPTION 'Owner row counts differ from predeployment snapshot; inspect before proceeding';
  END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',id::text,true),
  set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated')::text,true)
FROM public.profiles WHERE role='general' AND id <> '198a5af8-ea33-42bd-b810-422216a935e0' ORDER BY id LIMIT 1;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.is_dabao_owner() OR (SELECT count(*) FROM public.profiles) <> 1
    OR EXISTS(SELECT 1 FROM public.profiles WHERE id <> auth.uid())
    OR EXISTS(SELECT 1 FROM public.clients WHERE user_id <> auth.uid())
    OR EXISTS(SELECT 1 FROM public.relationships WHERE user_id <> auth.uid())
    OR (SELECT count(*) FROM public.user_statistics) <> 1 THEN
    RAISE EXCEPTION 'General member isolation failed';
  END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',id::text,true),
  set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated')::text,true)
FROM public.profiles WHERE role='student' ORDER BY id LIMIT 1;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.is_dabao_owner() OR (SELECT count(*) FROM public.profiles) <> 1
    OR EXISTS(SELECT 1 FROM public.profiles WHERE id <> auth.uid())
    OR EXISTS(SELECT 1 FROM public.clients WHERE user_id <> auth.uid())
    OR EXISTS(SELECT 1 FROM public.relationships WHERE user_id <> auth.uid())
    OR (SELECT count(*) FROM public.user_statistics) <> 1 THEN
    RAISE EXCEPTION 'Student isolation failed';
  END IF;
END $$;
RESET ROLE;
SELECT jsonb_build_object(
  'role_smoke_checks','PASS: owner, general, student',
  'tables',(SELECT jsonb_agg(jsonb_build_object('table',relname,'rls',relrowsecurity,
    'anonymous_select',has_table_privilege('anon',oid,'SELECT')) ORDER BY relname)
    FROM pg_class WHERE oid IN ('public.profiles'::regclass,'public.clients'::regclass,'public.relationships'::regclass)),
  'view_options',(SELECT reloptions FROM pg_class WHERE oid='public.user_statistics'::regclass),
  'policies',(SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('profiles','clients','relationships')),
  'guarded_rpcs',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('admin_add_credits','admin_adjust_points','admin_bulk_update_max_charts',
      'admin_update_feature_runtime','get_db_schema_export','simulate_payment_success','deduct_points_for_divination')
    AND position('dabao_rls_guard_v1' IN pg_get_functiondef(p.oid)) > 0
    AND NOT has_function_privilege('anon',p.oid,'EXECUTE')),
  'profile_trigger',(SELECT count(*) FROM pg_trigger WHERE tgrelid='public.profiles'::regclass AND tgname='guard_member_profile_update' AND tgenabled='O'),
  'row_counts',jsonb_build_object('profiles',(SELECT count(*) FROM public.profiles),'clients',(SELECT count(*) FROM public.clients),'relationships',(SELECT count(*) FROM public.relationships))
) AS verification;
COMMIT;
