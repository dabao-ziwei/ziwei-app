// Usage: node scripts/verify-rls-restore.mjs /absolute/path/to/restore.sql
// Offline PostgreSQL only. Never connects to Supabase or executes a financial RPC.
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const restore = await readFile(process.argv[2], 'utf8');
const migration = await readFile(new URL('../supabase/migrations/202610110002_member_chart_rls.sql', import.meta.url), 'utf8');
const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE profiles(id uuid PRIMARY KEY, email text, role text, max_charts int, max_edits_per_chart int,
      feature_flags jsonb, access_expiry timestamptz, is_banned boolean, has_claimed_welcome_gift boolean,
      credits int, points_balance int);
    CREATE TABLE clients(id uuid PRIMARY KEY,user_id uuid,name text,is_deleted boolean);
    CREATE TABLE relationships(id uuid PRIMARY KEY,user_id uuid,from_client_id uuid,to_client_id uuid,relation_type text);
    CREATE VIEW user_statistics AS SELECT id FROM profiles;
    CREATE FUNCTION admin_add_credits(target_user_id uuid,amount int,trans_type text,trans_desc text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
    CREATE FUNCTION admin_adjust_points(p_target_user_id uuid,p_delta int,p_reason text,p_admin_id uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
    CREATE FUNCTION admin_bulk_update_max_charts(p_user_ids uuid[],p_value int,p_mode text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
    CREATE FUNCTION admin_update_feature_runtime(p_feature_key text,p_config json,p_announcement json) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN RETURN true; END $$;
    CREATE FUNCTION get_db_schema_export() RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN RETURN '{}'; END $$;
    CREATE FUNCTION simulate_payment_success(p_transaction_id uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
    CREATE FUNCTION deduct_points_for_divination(p_user_id uuid,p_cost int) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN RETURN '{}'; END $$;
    INSERT INTO auth.users VALUES('198a5af8-ea33-42bd-b810-422216a935e0','stephenwu.0926@gmail.com');
    INSERT INTO profiles(id,email,role) SELECT id,email,'admin' FROM auth.users;
  `);
  const snapshot = async () => {
    const policies = (await db.query(`SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname`)).rows;
    const tables = (await db.query(`SELECT relname,relrowsecurity,relforcerowsecurity,reloptions FROM pg_class WHERE oid IN ('profiles'::regclass,'clients'::regclass,'relationships'::regclass,'user_statistics'::regclass) ORDER BY relname`)).rows;
    const grants = (await db.query(`SELECT c.relname,a.* FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE c.oid IN ('profiles'::regclass,'clients'::regclass,'relationships'::regclass,'user_statistics'::regclass) ORDER BY c.relname,a.grantee,a.privilege_type`)).rows;
    const functions = (await db.query(`SELECT proname,pg_get_functiondef(p.oid) AS definition,proconfig,proacl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY proname`)).rows;
    const data = (await db.query('SELECT * FROM profiles ORDER BY id')).rows;
    return { policies, tables, grants, functions, data };
  };
  // Load the genuine predeployment snapshot into fake tables as the baseline.
  await db.exec(restore);
  const before = await snapshot();
  assert.equal(before.policies.length, 13);
  assert.equal(before.functions.length, 7);
  await db.exec(migration);
  assert.equal((await snapshot()).tables.filter(t => t.relname !== 'user_statistics').every(t => t.relrowsecurity), true);
  await db.exec(restore);
  const after = await snapshot();
  // ACL order is not semantically significant. Normalize its array ordering.
  for (const snap of [before,after]) for (const f of snap.functions) {
    f.proacl = f.proacl.slice().sort();
  }
  assert.deepEqual(after, before);
  assert.equal((await db.query("SELECT count(*) AS count FROM pg_trigger WHERE tgname='guard_member_profile_update'")).rows[0].count, 0);
  console.log('PASS: real rollback snapshot restores all 13 policies, 7 RPC definitions/config/ACLs, table/view ACLs, RLS states and fake member data after migration.');
} finally { await db.close(); }
