import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createPasswordHandler, OWNER_ID, hashPassword, matchesPassword, validPassword } from '../server/temporaryPassword.mjs';

const member = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const resetId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const sessionId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const migration = await readFile(new URL('../supabase/migrations/202611010001_temporary_password.sql', import.meta.url), 'utf8');
const backup = await readFile(new URL('../supabase/operations/backup_temporary_password.sql', import.meta.url), 'utf8');

test('private reset state, session cutoffs, RLS and RPC enforcement in real isolated PostgreSQL', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT jsonb_build_object('session_id',current_setting('test.session',true)) $$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      CREATE TABLE public.clients(user_id uuid,name text);
      ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
      CREATE POLICY own ON clients USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
      CREATE TABLE public.previous_open(name text);
      GRANT ALL ON clients,previous_open TO anon,authenticated;
      CREATE FUNCTION public.member_rpc() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN 42; END $$;
      INSERT INTO auth.users VALUES('${OWNER_ID}'),('${member}');
      INSERT INTO clients VALUES('${member}','private'); INSERT INTO previous_open VALUES('public');
      INSERT INTO auth.sessions VALUES('${sessionId}','${member}',clock_timestamp()-interval '1 day');`);
    const restore = (await db.exec(backup)).at(-1).rows[0].restore_sql;
    await db.exec(migration);
    const login = async (user = member) => {
      await db.exec('RESET ROLE; SET ROLE authenticated');
      await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false),set_config('test.session',$2,false)`,[user,sessionId]);
    };
    await login();
    assert.equal((await db.query('SELECT * FROM clients')).rows.length,1);
    const transition = async action => {
      await db.exec('RESET ROLE');
      await db.query('SELECT password_reset_transition($1,$2,$3,$4,$5)',[member,resetId,action,'salt:hash',OWNER_ID]);
    };
    await transition('issue'); await transition('ready'); await login();
    assert.equal((await db.query('SELECT * FROM clients')).rows.length,0);
    assert.equal((await db.query('SELECT * FROM previous_open')).rows.length,0);
    await assert.rejects(db.query('SELECT member_rpc()'),/fresh login required/);
    await assert.rejects(db.query('TRUNCATE clients'),/permission denied/);
    await assert.rejects(db.query('SELECT * FROM password_reset_state'),/permission denied/);
    await assert.rejects(db.query(`SELECT password_reset_transition('${member}','${resetId}','complete')`),/permission denied/);
    let status = (await db.query('SELECT password_reset_status() s')).rows[0].s;
    assert.equal(status.fresh_session,false); assert.equal(status.state,'required');
    await db.exec(`RESET ROLE; UPDATE auth.sessions SET created_at=clock_timestamp()+interval '1 second'`);
    await login();
    status = (await db.query('SELECT password_reset_status() s')).rows[0].s;
    assert.equal(status.fresh_session,true);
    await transition('claim');
    await assert.rejects(transition('claim'),/invalid or expired/);
    await db.exec('RESET ROLE');
    await db.exec(restore);
    await login();
    assert.equal((await db.query('SELECT * FROM clients')).rows.length,1);
    assert.equal((await db.query('SELECT member_rpc() n')).rows[0].n,42);
    await db.exec('RESET ROLE');
    assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.previous_open'::regclass")).rows[0].relrowsecurity,false);
    assert.equal((await db.query("SELECT count(*)::int n FROM pg_policies WHERE policyname IN ('credential_session_gate','credential_previous_grants')")).rows[0].n,0);
    assert.equal((await db.query("SELECT has_table_privilege('authenticated','clients','TRUNCATE') a")).rows[0].a,true);
    await assert.rejects(transition('issue'),/busy/);
    await transition('complete');
    await db.exec(`UPDATE auth.sessions SET created_at=clock_timestamp()-interval '1 day'`);
    await login();
    assert.equal((await db.query('SELECT password_reset_session_allowed() a')).rows[0].a,false);
    await db.exec(`RESET ROLE; UPDATE auth.sessions SET created_at=clock_timestamp()+interval '1 second'`);
    await login();
    assert.equal((await db.query('SELECT * FROM clients')).rows.length,1);
    assert.equal((await db.query('SELECT member_rpc() n')).rows[0].n,42);
    await db.exec(`RESET ROLE; SET ROLE anon`);
    assert.equal((await db.query('SELECT * FROM previous_open')).rows.length,1);
    await login(OWNER_ID);
    assert.equal((await db.query('SELECT password_reset_session_allowed() a')).rows[0].a,true);
    await db.exec(`RESET ROLE; UPDATE password_reset_state SET state='required',expires_at=clock_timestamp()-interval '1 second'`);
    await assert.rejects(transition('claim'),/invalid or expired/);
  } finally { await db.close(); }
});

function fixture(actor = OWNER_ID, options = {}) {
  const calls = [];
  const state = { temporary_hash: hashPassword('TemporaryPassword123!') };
  const status = { state:'required',fresh_session:true,expired:false,reset_id:resetId,...options.status };
  const admin = {
    auth: { getUser: async () => ({data:{user:{id:actor}},error:options.authError}), admin: {
      getUserById: async () => ({data:{user:{id:member,email:'member@example.com',email_confirmed_at:'2026-01-01',...options.target}}}),
      updateUserById: async (id,payload) => { calls.push(['password',id,payload.password]); return {error:options.updateError}; },
      signOut: async () => { calls.push(['signOut']); return {error:options.revokeError}; },
    } },
    rpc: async (_,args) => { calls.push([args.p_action]); return {}; },
    from: () => { const chain = {select:()=>chain,eq:()=>chain,single:async()=>({data:state}),maybeSingle:async()=>({data:null})}; return chain; },
  };
  const handler = createPasswordHandler({admin,userClient:()=>({rpc:async()=>({data:status})}),enabled:options.enabled ?? true});
  return {calls, run: async body => {
    const res = {headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};
    await handler({method:'POST',headers:{authorization:'Bearer TEST_ONLY'},body},res); return res;
  }};
}
test('random temporary password only issued by owner; private hash and no-store response',async()=>{
  const f=fixture(); const response=await f.run({action:'issue',userId:member});
  assert.equal(response.code,200); assert.equal(response.headers['Cache-Control'],'no-store');
  assert.ok(validPassword(response.data.password)); assert.ok(response.data.password.length>=28);
  assert.deepEqual(f.calls.map(c=>c[0]),['issue','password','ready']);
  assert.equal((await fixture(member).run({action:'issue',userId:member})).code,403);
  assert.equal((await fixture().run({action:'issue',userId:OWNER_ID})).code,403);
  assert.equal((await fixture(OWNER_ID,{target:{email_confirmed_at:null}}).run({action:'issue',userId:member})).code,400);
  assert.ok(matchesPassword('example123456',hashPassword('example123456')));
  assert.equal(matchesPassword('wrong',hashPassword('example123456')),false);
});
test('completion requires fresh unexpired temporary login and a different strong password',async()=>{
  const body={action:'complete',resetId,password:'PersonalPassword123!'};
  for (const status of [{fresh_session:false},{expired:true},{state:'complete'}]) {
    const f=fixture(member,{status}); assert.equal((await f.run(body)).code,403); assert.equal(f.calls.length,0);
  }
  assert.equal((await fixture(member).run({...body,password:'TemporaryPassword123!'})).code,400);
  assert.equal((await fixture(member).run({...body,password:'short'})).code,400);
  const f=fixture(member); assert.equal((await f.run(body)).code,200);
  assert.deepEqual(f.calls.map(c=>c[0]),['claim','password','complete','signOut']);
  const failed=fixture(member,{updateError:{message:'TEST'}});
  assert.equal((await failed.run(body)).code,400);
  assert.deepEqual(failed.calls.map(c=>c[0]),['claim','password','retry']);
  const issuedFailure=fixture(OWNER_ID,{updateError:{}});
  assert.equal((await issuedFailure.run({action:'issue',userId:member})).code,503);
  assert.deepEqual(issuedFailure.calls.map(c=>c[0]),['issue','password']);
  const revokeFailed=fixture(member,{revokeError:{message:'TEST'}});
  const result=await revokeFailed.run(body);
  assert.equal(result.code,200); assert.equal(result.data.sessionsRevoked,false);
  assert.ok(revokeFailed.calls.some(c=>c[0]==='complete'));
});
test('disabled service and invalid credentials never mutate passwords',async()=>{
  for (const [options,code] of [[{enabled:false},503],[{authError:{}},401]]) {
    const f=fixture(OWNER_ID,options);
    assert.equal((await f.run({action:'issue',userId:member})).code,code);
    assert.equal(f.calls.length,0);
  }
});
