import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';
import { createConsultationHandler, chartMetadata, assertPublicKey, ExportError, hash } from '../server/consultationCharts.mjs';

const bundle = buildSync({entryPoints:['src/consultation/natalRender.tsx'],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',packages:'external',
  define:{__CONSULTATION_RENDER_VERSION__:'"natal-v1-test"'}});
const mod={exports:{}};
new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const {buildNatalSnapshot,buildNatalHTML,canExportProfile}=mod.exports;
test('cold Vite config bundling never imports not-yet-generated renderer assets',()=>{
  const config = buildSync({entryPoints:['server/consultationExportDev.mjs'],bundle:true,write:false,
    platform:'node',format:'esm',packages:'external',metafile:true});
  const inputs=Object.keys(config.metafile.inputs);
  assert.deepEqual(inputs,['server/consultationExportDev.mjs']);
  assert.ok(!inputs.some(path=>path.includes('generated/') || path.endsWith('consultationCharts.mjs')));
});
const owner='198a5af8-ea33-42bd-b810-422216a935e0';
const alice='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const bob='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const id1='11111111-1111-4111-8111-111111111111';
const id2='22222222-2222-4222-8222-222222222222';
const id3='33333333-3333-4333-8333-333333333333';
const row=(id=id1,user_id=alice,extra={})=>({id,user_id,name:'同名命主',gender:'女',birth_year:1988,birth_month:6,birth_day:15,birth_hour:14,birth_minute:30,
  type:'客戶',created_at:'2026-01-01T00:00:00Z',is_deleted:false,...extra});
function png() {const b=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(b);b.writeUInt32BE(2560,16);b.writeUInt32BE(1920,20);return b;}
function fixture(options={}) {
  const f={rows:options.rows||[row(),row(id2,bob),row(id3,alice,{is_deleted:true})],renders:0,tokens:[],filters:[]};
  f.profile={id:options.user||alice,role:'student',feature_flags:{screenshot:true},...options.profile};
  f.state=options.state||{state:'normal'};
  f.authError=options.authError;
  const client={auth:{getUser:async()=>({data:{user:{id:f.profile.id}},error:f.authError})},rpc:async()=>({data:f.state,error:options.stateError}),
    from(table) {
      let clauses=[],pattern,cursor,limit;
      const read=()=>{
        if(table==='profiles')return options.noProfile?[]:[f.profile];
        let found=f.rows.filter(r=>f.profile.id===owner || r.user_id===f.profile.id).filter(r=>clauses.every(([k,v])=>r[k]===v));
        if(pattern){const literal=pattern.slice(1,-1).replace(/\\([\\%_])/g,'$1').toLowerCase(); found=found.filter(r=>r.name.toLowerCase().includes(literal));}
        if(cursor)found=found.filter(r=>r.id>cursor);
        found.sort((a,b)=>a.id.localeCompare(b.id)); return limit?found.slice(0,limit):found;
      };
      const chain={select(){return chain;},eq(k,v){clauses.push([k,v]);f.filters.push([table,k,v]);return chain;},
        order(){return chain;},limit(n){limit=n;return chain;},gt(k,v){assert.equal(k,'id');cursor=v;return chain;},
        ilike(k,v){assert.equal(k,'name');pattern=v;f.pattern=v;return chain;},maybeSingle:async()=>({data:read()[0]||null}),
        then(yes,no){return Promise.resolve({data:read()}).then(yes,no);}};
      return chain;
    }};
  f.run=async({resource='charts',query='',body,token='test-token',method=resource==='charts'?'GET':'POST'}={})=>{
    const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(data){this.body=data;return this;},send(data){this.body=data;return this;}};
    const handler=createConsultationHandler({resource,enabled:options.enabled??true,publicAuth:{url:'https://example.supabase.co',publishable_key:'public'},
      createUserClient(t){f.tokens.push(t);return client;},canExportProfile,
      async renderPNG(input){f.renders++;assert.equal(input.id,body?.chart_id);await options.duringRender?.(f);if(options.renderError)throw options.renderError;
        return {png:options.badPNG?Buffer.from('not a png'):png(),rendererRevision:'natal-v1-test'};}});
    await handler({method,url:`/api/test${query}`,headers:token?{authorization:`Bearer ${token}`}:{},body},res); return res;
  };
  return f;
}
test('discovery is public but contains only public Auth configuration and fixed synchronous PNG contract',async()=>{
  const f=fixture();const r=await f.run({query:'?operation=capabilities',token:null});
  assert.equal(r.statusCode,200);assert.equal(f.tokens.length,0);assert.equal(r.body.image.width,2560);assert.equal(r.body.image.synchronous,true);
  assert.equal((await fixture({enabled:false}).run()).statusCode,503);
  assert.throws(()=>assertPublicKey('sb_secret_example'),/公開金鑰/);
  assert.throws(()=>assertPublicKey(`h.${Buffer.from('{"role":"service_role"}').toString('base64url')}.s`),/公開金鑰/);
  assert.doesNotThrow(()=>assertPublicKey(`h.${Buffer.from('{"role":"anon"}').toString('base64url')}.s`));
});
test('search binds the JWT-scoped client; excludes other members and deleted rows, owner retains access',async()=>{
  const member=fixture();const r=await member.run();assert.equal(r.statusCode,200);assert.deepEqual(r.body.charts.map(c=>c.chart_id),[id1]);
  assert.deepEqual(member.tokens,['test-token']);assert.ok(member.filters.some(([t,k,v])=>t==='clients'&&k==='is_deleted'&&v===false));
  const admin=await fixture({user:owner,profile:{role:'admin',feature_flags:{screenshot:false}}}).run();
  assert.deepEqual(admin.body.charts.map(c=>c.chart_id),[id1,id2]);assert.equal(admin.body.charts[0].can_export,true);
  const hidden=await fixture({profile:{feature_flags:{screenshot:false}}}).run();assert.equal(hidden.statusCode,200);assert.equal(hidden.body.charts[0].can_export,false);
});
test('same names have distinct stable UUIDs and birth metadata; keyset pagination and literal search are bounded',async()=>{
  const f=fixture({user:owner,rows:[row(),row(id2,bob,{birth_year:1999}),row(id3,alice,{name:'100%_命主'})]});
  const r=await f.run({query:'?limit=1'});assert.equal(r.body.next_cursor,id1);assert.equal(r.body.has_more,true);
  const second=await f.run({query:`?limit=1&cursor=${id1}`});assert.equal(second.body.charts[0].chart_id,id2);assert.equal(second.body.charts[0].birth.year,1999);
  const literal=await f.run({query:'?q=100%25_'});assert.deepEqual(literal.body.charts.map(c=>c.chart_id),[id3]);assert.equal(f.pattern,'%100\\%\\_%');
  for(const query of ['?limit=101','?limit=0','?limit=1.1','?cursor=bad','?q='+('x'.repeat(101)),'?user_id='+bob])assert.equal((await f.run({query})).statusCode,400);
});
test('single chart metadata: inaccessible, missing and soft-deleted IDs all return identical 404',async()=>{
  const f=fixture();const results=[];
  for(const id of [id2,id3,'44444444-4444-4444-8444-444444444444']){const r=await f.run({query:`?chart_id=${id}`});assert.equal(r.statusCode,404);results.push(r.body.error);}
  assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
  assert.equal((await f.run({query:`?chart_id=${id1}`})).body.chart.chart_id,id1);
});
test('auth and existing password/account/export flags fail closed before rendering',async()=>{
  assert.equal((await fixture().run({token:null})).statusCode,401);
  assert.equal((await fixture({authError:{status:401}}).run()).statusCode,401);
  assert.equal((await fixture({stateError:{}}).run()).statusCode,503);
  for(const state of [{state:'required',fresh_session:true},{state:'complete',fresh_session:false},{state:'issuing'}]){
    const f=fixture({state});const r=await f.run({resource:'export',body:{chart_id:id1}});assert.equal(r.body.error.code,'PASSWORD_CHANGE_REQUIRED');assert.equal(f.renders,0);
  }
  for(const [profile,code] of [[{is_banned:true},'ACCOUNT_DISABLED'],[{access_expiry:'2000-01-01'},'ACCOUNT_EXPIRED'],[{feature_flags:{screenshot:false}},'EXPORT_FORBIDDEN']]){
    const f=fixture({profile});const r=await f.run({resource:'export',body:{chart_id:id1}});assert.equal(r.statusCode,403);assert.equal(r.body.error.code,code);assert.equal(f.renders,0);
  }
});
test('binary PNG export rechecks access and revision; private no-store headers and digest identify the bound chart',async()=>{
  const f=fixture();const revision=chartMetadata(row(),true).source_revision;
  const r=await f.run({resource:'export',body:{chart_id:id1,expected_revision:revision}});
  assert.equal(r.statusCode,200);assert.equal(r.headers['Content-Type'],'image/png');assert.equal(r.headers['X-Chart-Id'],id1);
  assert.equal(r.headers['X-Chart-Source-Revision'],revision);assert.equal(r.headers['X-Content-SHA256'],hash(r.body));assert.match(r.headers['Cache-Control'],/no-store/);
  assert.equal(r.body.readUInt32BE(16),2560);assert.equal(r.body.readUInt32BE(20),1920);assert.equal(f.filters.filter(([t])=>t==='profiles').length,2);
});
test('no arbitrary birth/time overrides, destinations or URLs are accepted; limits and revision mismatch prevent work',async()=>{
  for(const body of [{chart_id:id1,birth_hour:22},{chart_id:id1,url:'http://internal/'},{chart_id:[id1]},
    {chart_id:id1,expected_revision:['a'.repeat(64)]},{name:'同名命主'},[],{chart_id:'bad'},'{bad']) {
    const f=fixture();const r=await f.run({resource:'export',body});assert.equal(r.statusCode,400);assert.equal(f.renders,0);
  }
  assert.equal((await fixture().run({resource:'export',body:'x'.repeat(4097)})).statusCode,413);
  const f=fixture();const r=await f.run({resource:'export',body:{chart_id:id1,expected_revision:'f'.repeat(64)}});assert.equal(r.statusCode,409);assert.equal(f.renders,0);
});
test('mid-render edit, deletion, revocation and mandatory password reset discard image instead of returning it',async()=>{
  const cases=[[(f)=>{f.rows[0].birth_hour=18;},409],[(f)=>{f.rows[0].is_deleted=true;},404],
    [(f)=>{f.profile.feature_flags.screenshot=false;},403],[(f)=>{f.state={state:'required'};},403],[(f)=>{f.authError={status:401};},401]];
  for(const [duringRender,status] of cases){const f=fixture({duringRender});const r=await f.run({resource:'export',body:{chart_id:id1}});assert.equal(r.statusCode,status);assert.equal(r.headers['Content-Type'],undefined);assert.equal(f.renders,1);}
});
test('render failures, busy, timeout and invalid PNG are JSON and never expose raw errors or chart data',async()=>{
  for(const [renderError,status] of [[new Error('PRIVATE SQL secret'),502],[new ExportError(429,'EXPORT_BUSY','busy'),429],[Object.assign(new Error('PRIVATE'),{name:'TimeoutError'}),504]]){
    const r=await fixture({renderError}).run({resource:'export',body:{chart_id:id1}});assert.equal(r.statusCode,status);assert.ok(!JSON.stringify(r.body).includes('PRIVATE'));assert.match(r.headers['Cache-Control'],/no-store/);
    if(status===429)assert.equal(r.headers['Retry-After'],'5');
  }
  assert.equal((await fixture({badPNG:true}).run({resource:'export',body:{chart_id:id1}})).statusCode,502);
});
test('pure natal snapshot uses saved fields only, same engine rules, all twelve palaces and natal SiHua only',()=>{
  const base=row(id1,alice,{birth_year:1979,birth_month:9,birth_day:26,birth_hour:18,birth_minute:26});
  const a=buildNatalSnapshot(base);const b=buildNatalSnapshot({...base,currentHour:4,daXianSeq:5,liuNianYear:2027,showXiaoXian:true,whiteboard:['ink']});
  assert.deepEqual(a,b);assert.equal(a.client.birthHour,18);assert.equal(a.chartData.palaces.length,12);
  const allStars=a.chartData.palaces.flatMap(p=>[...p.majorStars,...p.minorStars,...p.miscStars,...p.limitStars]);
  assert.ok(a.chartData.palaces.every(p=>p.limitStars.length===0));
  const sihua=allStars.flatMap(s=>(s.sihua||[]).map(h=>({name:s.name,...h})));
  assert.equal(sihua.length,4);assert.ok(sihua.every(h=>h.scope==='ben'));
  assert.ok(sihua.some(h=>h.name==='天梁'&&h.type==='科'));assert.ok(sihua.some(h=>h.name==='貪狼'&&h.type==='權'));
  assert.equal(canExportProfile({id:alice,role:'student',feature_flags:{}}),false);
  assert.equal(canExportProfile({id:owner,role:'general',feature_flags:{screenshot:false}}),true);
});
test('SSR markup reuses PalaceGrid and escapes names; no selected/ring state, lines, whiteboard or period data',()=>{
  const html=buildNatalHTML(row(id1,alice,{name:'命主<script>alert(1)</script>'}), '/* trusted css */');
  assert.equal((html.match(/data-natal-palace=/g)||[]).length,12);assert.match(html,/&lt;script&gt;/);
  assert.equal((html.match(/data-sihua-badge="ben"/g)||[]).length,4);
  assert.match(html,/button:not\(\[data-sihua-badge\]\)/);
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('whiteboard-layer'));assert.ok(!html.includes('<line '));
  assert.ok(!html.includes('bg-red-50/60'));assert.ok(!html.includes('ring-4 ring-red-500'));assert.match(html,/font-src data:/);
  assert.match(html,/width:1280px/);assert.match(html,/height:960px/);
  for(const bad of [row(id1,alice,{birth_month:2,birth_day:31}),row(id1,alice,{birth_hour:24}),row(id1,alice,{gender:'unknown'})])assert.throws(()=>buildNatalSnapshot(bad),/Invalid persisted/);
});
