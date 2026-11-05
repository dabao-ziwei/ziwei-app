// Opt-in, isolated HTTP + actual headless PNG. Auth/DB are a local fake service;
// this never logs into Supabase or changes any real customer/account data.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { productionHandler, hash } from '../server/consultationCharts.mjs';

const executable = process.env.CONSULTATION_CHROME_EXECUTABLE;
const linuxBrowser = process.platform === 'linux' && process.env.CONSULTATION_TEST_LINUX === 'true';
test('native-style HTTP client receives real 2560x1920 PNG through production auth/render pipeline', { skip: !executable && !linuxBrowser, timeout:60000 }, async()=>{
  const id='11111111-1111-4111-8111-111111111111';
  const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const chart={id,user_id:uid,name:'本命輸出測試',gender:'男',birth_year:1979,birth_month:9,birth_day:26,birth_hour:18,birth_minute:26,
    type:'客戶',created_at:'2026-01-01T00:00:00Z',is_deleted:false};
  let authChecks=0;
  const authServer=createServer((req,res)=>{
    res.setHeader('Content-Type','application/json');
    if(req.headers.authorization!=='Bearer offline-test-access-token'){res.statusCode=401;res.end('{"message":"invalid token"}');return;}
    const url=new URL(req.url,'http://test.invalid');
    if(url.pathname==='/auth/v1/user'){authChecks++;res.end(JSON.stringify({id:uid,email:'offline@example.invalid'}));}
    else if(url.pathname==='/rest/v1/rpc/password_reset_status')res.end('{"state":"normal"}');
    else if(url.pathname==='/rest/v1/profiles')res.end(JSON.stringify([{id:uid,role:'student',feature_flags:{screenshot:true},is_banned:false}]));
    else if(url.pathname==='/rest/v1/clients')res.end(JSON.stringify(url.searchParams.get('id')==='eq.'+id?[chart]:[]));
    else {res.statusCode=404;res.end('{}');}
  });
  authServer.listen(0,'127.0.0.1');await once(authServer,'listening');
  const environment={CONSULTATION_EXPORT_ENABLED:'true',CONSULTATION_CHROME_EXECUTABLE:executable,
    SUPABASE_URL:`http://127.0.0.1:${authServer.address().port}`,SUPABASE_ANON_KEY:'sb_publishable_offline_fixture'};
  const charts=productionHandler('charts',environment),image=productionHandler('export',environment);
  const apiServer=createServer(async(req,res)=>{
    res.status=code=>{res.statusCode=code;return res;};
    res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
    res.send=data=>res.end(data);
    let body='';for await(const chunk of req)body+=chunk;req.body=body;
    await (req.url.startsWith('/api/consultation-chart-export')?image:charts)(req,res);
  });
  apiServer.listen(0,'127.0.0.1');await once(apiServer,'listening');
  try {
    const root=`http://127.0.0.1:${apiServer.address().port}`;
    const headers={Authorization:'Bearer offline-test-access-token'};
    const meta=await fetch(`${root}/api/consultation-charts?chart_id=${id}`,{headers});assert.equal(meta.status,200);
    const {chart: selected}=await meta.json();assert.equal(selected.chart_id,id);
    const response=await fetch(`${root}/api/consultation-chart-export`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({chart_id:id,expected_revision:selected.source_revision})});
    if(response.status!==200)assert.fail(`Export failed: ${response.status} ${await response.text()}`);
    assert.equal(response.headers.get('content-type'),'image/png');
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16),2560);assert.equal(bytes.readUInt32BE(20),1920);
    assert.ok(bytes.length>30000);assert.equal(response.headers.get('x-content-sha256'),hash(bytes));
    assert.equal(response.headers.get('x-chart-source-revision'),selected.source_revision);
    assert.equal(authChecks,3); // metadata, pre-render and post-render validation
    assert.match(response.headers.get('cache-control'),/no-store/);
    const noLogin=await fetch(`${root}/api/consultation-chart-export`,{method:'POST'});assert.equal(noLogin.status,401);
    const missing=await fetch(`${root}/api/consultation-charts?chart_id=99999999-9999-4999-8999-999999999999`,{headers});assert.equal(missing.status,404);
  } finally {
    apiServer.closeAllConnections();authServer.closeAllConnections();
    await Promise.all([new Promise(resolve=>apiServer.close(resolve)),new Promise(resolve=>authServer.close(resolve))]);
  }
});
