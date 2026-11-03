// Real React reconciliation, with fake Auth/RPC only. Never touches real accounts.
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { authSessionIdentity } from '../src/logic/authSessionIdentity.ts';

const require = createRequire(import.meta.url);
const root = path.resolve('.');
const hook = JSON.stringify(path.join(root, 'src/hooks/useWhiteboardMode.ts'));
const mocks = {
  supabase: 'export const supabase = globalThis.__authRefreshTest.supabase;',
  temporaryPassword: 'export const temporaryPasswordEnabled = true;',
  db: 'export const saveClient = async () => null; export const addRelationship = async () => {}; export const getInverseRelationType = () => "";',
  AddChartModal: 'export const AddChartModal = () => null;',
  RequireMeChart: `import { useEffect } from 'react'; export function RequireMeChart({children}) {
    useEffect(()=>{ globalThis.__authRefreshTest.layoutMounts++; },[]); return children; }`,
  UpdatePassword: `import {createElement} from 'react'; export function UpdatePassword(props) { return createElement('password-form',props); }`,
  ChartBoard: `import {createElement,useEffect,useState} from 'react'; import {useWhiteboardMode} from ${hook};
    export function ChartBoard() {
      const mode=useWhiteboardMode(); const [ink,setInk]=useState([]); const [year,setYear]=useState(null); const [da,setDa]=useState(-1);
      useEffect(()=>{ globalThis.__authRefreshTest.mounts++; return ()=>{globalThis.__authRefreshTest.unmounts++;}; },[]);
      return createElement('chart-probe',{writing:mode.isWhiteboardActive,ink,year,da,
        start:mode.toggleWhiteboard,draw:()=>setInk(v=>[...v,'stroke']),select:()=>{setYear(2027);setDa(4);}});
    }`,
};
const namedStubs = ['LegalPage','Auth','ClientList','Dashboard','RequirePermission','DualChart',
  'CompatibilitySetup','LuckyPage','StorePage','SystemAdmin','BookingPage','PaymentResult'];
const bundled = await build({
  entryPoints:['src/App.tsx'], bundle:true, write:false, platform:'node', format:'cjs',
  jsx:'automatic', packages:'external', plugins:[{
    name:'auth-test-boundaries', setup(builder) {
      builder.onResolve({filter:/^(@vercel\/|lucide-react$)/},args=>({path:args.path,namespace:'external-stub'}));
      builder.onLoad({filter:/.*/,namespace:'external-stub'},()=>({contents:'export const Loader2=()=>null; export const SpeedInsights=()=>null; export const Analytics=()=>null;'}));
      builder.onResolve({filter:/^\.{1,2}\//},args=>{
        const name=path.basename(args.path).replace(/\.tsx?$/,'');
        if(mocks[name] || namedStubs.includes(name)) return {path:name,namespace:'app-stub'};
      });
      builder.onLoad({filter:/.*/,namespace:'app-stub'},args=>({
        contents:mocks[args.path] || `import {createElement} from 'react'; export function ${args.path}({children}) { return children || createElement('${args.path.toLowerCase()}'); }`,
        resolveDir:root,
      }));
    },
  }],
});
function session(user='alice', login='login-a', revision=0) {
  const payload=Buffer.from(JSON.stringify({sub:user,session_id:login,iat:revision})).toString('base64url');
  return {user:{id:user},access_token:`header.${payload}.signature-${revision}`};
}
const originals={window:globalThis.window,document:globalThis.document,sessionStorage:globalThis.sessionStorage};
let renderer;
let driver;
afterEach(async()=>{
  if(renderer) await act(async()=>renderer.unmount());
  renderer=null;
  delete globalThis.__authRefreshTest;
  Object.assign(globalThis,originals);
});
async function mount() {
  globalThis.window=Object.assign(new EventTarget(),{setTimeout,clearTimeout,matchMedia:()=>({matches:true})});
  globalThis.document={documentElement:{}};
  globalThis.sessionStorage={getItem:()=>null,removeItem:()=>{}};
  driver={session:session(),requests:[],mounts:0,unmounts:0,layoutMounts:0};
  driver.supabase={
    auth:{ getSession:async()=>({data:{session:driver.session}}),onAuthStateChange:callback=>{
      driver.callback=callback; return {data:{subscription:{unsubscribe(){}}}};
    } },
    rpc:name=>{
      assert.equal(name,'password_reset_status');
      let resolve,reject;
      const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
      const request={resolve,reject}; driver.requests.push(request);
      return {abortSignal(signal){request.signal=signal; signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}); return promise;}};
    },
  };
  globalThis.__authRefreshTest=driver;
  const module={exports:{}};
  new Function('require','module','exports',bundled.outputFiles[0].text)(require,module,module.exports);
  const App=module.exports.default;
  await act(async()=>{renderer=TestRenderer.create(React.createElement(MemoryRouter,{initialEntries:['/chart/test'],future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(App)));});
}
const probe=()=>renderer.root.findByType('chart-probe');
const chartContainer=()=>renderer.root.findAllByType('div').find(node=>node.props.style?.display === 'none' || node.props.style?.display === 'contents');
async function resolve(request=driver.requests.at(-1),status={state:'normal'}) {
  await act(async()=>request.resolve({data:status,error:null}));
}
async function prepareChart() {
  await resolve();
  await act(async()=>{probe().props.start();probe().props.draw();probe().props.draw();probe().props.select();});
}
function unchanged() {
  assert.equal(driver.mounts,1); assert.equal(driver.unmounts,0); assert.equal(driver.layoutMounts,1);
  assert.equal(probe().props.writing,true); assert.deepEqual(probe().props.ink,['stroke','stroke']);
  assert.equal(probe().props.da,4); assert.equal(probe().props.year,2027);
}
async function auth(event,next) {
  driver.session=next;
  await act(async()=>driver.callback(event,next));
}

test('session identity ignores JWT rotation but never aliases users, new logins or malformed tokens',()=>{
  assert.equal(authSessionIdentity(session()),authSessionIdentity(session('alice','login-a',99)));
  assert.notEqual(authSessionIdentity(session()),authSessionIdentity(session('alice','login-b')));
  assert.notEqual(authSessionIdentity(session()),authSessionIdentity(session('bob','login-a')));
  assert.notEqual(authSessionIdentity({user:{id:'bob'},access_token:session().access_token}),authSessionIdentity(session()));
  assert.equal(authSessionIdentity(null),null);
  assert.notEqual(authSessionIdentity({user:{id:'alice'},access_token:'broken-a'}),authSessionIdentity({user:{id:'alice'},access_token:'broken-b'}));
});
test('initial login waits for server authorization before mounting any chart',async()=>{
  await mount(); assert.equal(driver.mounts,0); assert.equal(renderer.root.findAllByType('chart-probe').length,0);
  await resolve(); assert.equal(driver.mounts,1);
});
test('repeated TOKEN_REFRESHED preserves mounted chart, real whiteboard mode, ink, Da and year during and after checks',async()=>{
  await mount(); await prepareChart();
  for(let n=1;n<=12;n++) {
    const previous=driver.requests.length;
    await auth('TOKEN_REFRESHED',session('alice','login-a',n));
    assert.equal(driver.requests.length,previous+1); unchanged();
    await resolve(); unchanged();
  }
});
test('same-login SIGNED_IN and window focus never remount the protected layout',async()=>{
  await mount(); await prepareChart();
  await auth('SIGNED_IN',{...driver.session,user:{...driver.session.user}}); unchanged();
  await act(async()=>window.dispatchEvent(new Event('focus'))); unchanged();
  await resolve(); unchanged();
});
test('failed background check blocks the chart without losing state; retry restores the same mounted chart',async()=>{
  await mount(); await prepareChart();
  await auth('TOKEN_REFRESHED',session('alice','login-a',1));
  await act(async()=>driver.requests.at(-1).reject(new Error('network unavailable')));
  unchanged();
  assert.equal(chartContainer().props.style.display,'none');
  assert.ok(renderer.root.findByProps({role:'alert'}));
  const retry=renderer.root.findAllByType('button').find(b=>b.children.includes('重試'));
  await act(async()=>retry.props.onClick()); unchanged();
  assert.equal(chartContainer().props.style.display,'none');
  await resolve(); unchanged(); assert.equal(chartContainer().props.style.display,'contents');
});
test('initial check failure cannot mount a chart without previous authorization',async()=>{
  await mount();
  await act(async()=>driver.requests.at(-1).reject(new Error('offline')));
  assert.equal(driver.mounts,0); assert.equal(renderer.root.findAllByType('chart-probe').length,0);
  assert.ok(renderer.root.findByProps({role:'alert'}));
});
test('overlapping focus checks ignore stale responses and preserve the writing session',async()=>{
  await mount(); await prepareChart();
  await act(async()=>window.dispatchEvent(new Event('focus')));
  const stale=driver.requests.at(-1);
  await act(async()=>window.dispatchEvent(new Event('focus')));
  assert.ok(stale.signal.aborted); unchanged();
  await resolve(stale,{state:'complete',fresh_session:false}); unchanged();
  await resolve(); unchanged();
});
test('confirmed mandatory password reset still removes chart and forces the password form',async()=>{
  await mount(); await prepareChart();
  await auth('TOKEN_REFRESHED',session('alice','login-a',1));
  await resolve(undefined,{state:'required',fresh_session:true,expired:false,reset_id:'reset-id'});
  assert.equal(renderer.root.findAllByType('chart-probe').length,0); assert.equal(driver.unmounts,1);
  assert.equal(renderer.root.findByType('password-form').props.forcedResetId,'reset-id');
});
test('a new login for the same user cannot reuse old authorization while its check is pending',async()=>{
  await mount(); await prepareChart();
  await auth('SIGNED_IN',session('alice','login-b'));
  assert.equal(renderer.root.findAllByType('chart-probe').length,0);
  await resolve(undefined,{state:'complete',fresh_session:false});
  assert.equal(renderer.root.findAllByType('chart-probe').length,0); assert.ok(renderer.root.findByProps({role:'alert'}));
});
test('expired temporary credentials stay blocked and cannot open the chart or password form',async()=>{
  await mount(); await resolve(undefined,{state:'required',fresh_session:true,expired:true});
  assert.equal(driver.mounts,0); assert.equal(renderer.root.findAllByType('password-form').length,0);
  assert.ok(renderer.root.findByProps({role:'alert'}));
});
test('account switch ignores stale RPC completion and cannot show previous account chart state',async()=>{
  await mount(); await prepareChart();
  await auth('TOKEN_REFRESHED',session('alice','login-a',1));
  const stale=driver.requests.at(-1);
  await auth('SIGNED_IN',session('bob','login-b'));
  assert.ok(stale.signal.aborted); assert.equal(renderer.root.findAllByType('chart-probe').length,0);
  await resolve(stale); assert.equal(renderer.root.findAllByType('chart-probe').length,0);
  await resolve(); assert.equal(driver.mounts,2); assert.deepEqual(probe().props.ink,[]); assert.equal(probe().props.writing,false);
});
test('logout still removes chart and returns to login',async()=>{
  await mount(); await prepareChart(); await auth('SIGNED_OUT',null);
  assert.equal(renderer.root.findAllByType('chart-probe').length,0); assert.equal(driver.unmounts,1);
  assert.equal(renderer.root.findAllByType('auth').length,1);
});
