import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { createConsultationHandler } from '../server/consultationCharts.mjs';

const owner='198a5af8-ea33-42bd-b810-422216a935e0',alice='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',bob='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
test('consultation handlers use actual existing PostgreSQL RLS and password session gate, not administrator bypass',async()=>{
  const db=new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      CREATE TABLE auth.sessions(id uuid,user_id uuid,created_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
      CREATE TABLE profiles(id uuid PRIMARY KEY,email text,role text,is_banned boolean DEFAULT false,access_expiry timestamptz,
        has_claimed_welcome_gift boolean DEFAULT false,feature_flags jsonb DEFAULT '{"screenshot":true}');
      CREATE TABLE clients(id uuid PRIMARY KEY,user_id uuid,name text,gender text DEFAULT '女',birth_year int DEFAULT 1988,birth_month int DEFAULT 6,
        birth_day int DEFAULT 15,birth_hour int DEFAULT 14,birth_minute int DEFAULT 30,type text DEFAULT '客戶',created_at timestamptz DEFAULT now(),is_deleted boolean DEFAULT false);
      CREATE TABLE relationships(id uuid PRIMARY KEY,user_id uuid,from_client_id uuid,to_client_id uuid);
      CREATE VIEW user_statistics AS SELECT id FROM profiles;
      INSERT INTO auth.users VALUES('${owner}','stephenwu.0926@gmail.com'),('${alice}','alice@example.invalid'),('${bob}','bob@example.invalid');
      INSERT INTO profiles(id,email,role) SELECT id,email,'student' FROM auth.users;
      INSERT INTO clients(id,user_id,name) VALUES('${a}','${alice}','同名客戶'),('${b}','${bob}','同名客戶');`);
    for(const file of ['202610110002_member_chart_rls.sql','202611010001_temporary_password.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
    async function scoped(uid,sql,values=[]) {
      await db.exec('RESET ROLE');
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[uid]);
      await db.exec('SET ROLE authenticated');
      return db.query(sql,values);
    }
    function userClient(uid) {
      return {auth:{getUser:async()=>({data:{user:{id:uid}}})},rpc:async()=>({data:(await scoped(uid,'SELECT public.password_reset_status() s')).rows[0].s}),
        from(table) {
          assert.ok(['profiles','clients'].includes(table));
          let columns='*',clauses=[],limit,order;
          const run=async()=>{
            const values=clauses.map(c=>c.value);
            let sql=`SELECT ${columns} FROM public.${table}`;
            if(clauses.length)sql+=' WHERE '+clauses.map((c,i)=>`${c.column} ${c.operator} $${i+1}`).join(' AND ');
            if(order)sql+=' ORDER BY id ASC';if(limit)sql+=' LIMIT '+limit;
            return {data:(await scoped(uid,sql,values)).rows};
          };
          const query={select(c){assert.match(c,/^[a-z_,*]+$/);columns=c;return query;},eq(column,value){clauses.push({column,value,operator:'='});return query;},
            gt(column,value){clauses.push({column,value,operator:'>'});return query;},ilike(column,value){clauses.push({column,value,operator:'ILIKE'});return query;},
            order(){order=true;return query;},limit(n){limit=n;return query;},async maybeSingle(){return {data:(await run()).data[0]||null};},then(yes,no){return run().then(yes,no);}};
          return query;
        }};
    }
    const handler=createConsultationHandler({resource:'charts',enabled:true,publicAuth:{},createUserClient:userClient,
      canExportProfile:p=>p.id===owner||p.feature_flags.screenshot===true,renderPNG:()=>assert.fail('Search must not render')});
    const request=async(uid,query='')=>{
      const res={setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
      await handler({method:'GET',url:'/api/consultation-charts'+query,headers:{authorization:'Bearer '+uid}},res);return res;
    };
    assert.deepEqual((await request(alice)).body.charts.map(c=>c.chart_id),[a]);
    assert.deepEqual((await request(bob)).body.charts.map(c=>c.chart_id),[b]);
    assert.deepEqual((await request(owner)).body.charts.map(c=>c.chart_id),[a,b]);
    assert.equal((await request(alice,'?chart_id='+b)).code,404);
    assert.equal((await request(owner,'?chart_id='+b)).code,200);
    await db.exec(`RESET ROLE; UPDATE clients SET is_deleted=true WHERE id='${b}'`);
    assert.equal((await request(owner,'?chart_id='+b)).code,404);
    await db.exec(`RESET ROLE; INSERT INTO password_reset_state VALUES('${alice}','${a}','required',now(),now()+interval '1 day',now(),now(),NULL,'${owner}')`);
    const denied=await request(alice);assert.equal(denied.code,403);assert.equal(denied.body.error.code,'PASSWORD_CHANGE_REQUIRED');
    assert.equal((await request(owner)).code,200);
  } finally { await db.close(); }
});
