import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createApp} from '../src/server.mjs';
import {configuration} from '../src/recognition.mjs';

test('classroom loads a brief roster and a single poem without adding all timings to the catalog',async t=>{
  const app=createApp(configuration({}));await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>app.close(resolve)));
  const base=`http://127.0.0.1:${app.address().port}`;
  const brief=await(await fetch(base+'/api/catalog?brief=1')).text();assert.ok(Buffer.byteLength(brief)<2500);
  const roster=JSON.parse(brief).poems;assert.equal(roster.length,26);assert.deepEqual(Object.keys(roster[0]).sort(),['id','surnames']);
  const detail=await(await fetch(base+'/api/poem?id=wang-wuyixiang&surname=王')).text();assert.ok(Buffer.byteLength(detail)<6000);
  const data=JSON.parse(detail);assert.equal(data.poem.id,'wang-wuyixiang');assert.equal(data.poem.timing.lines.length,2);assert.equal(data.poems,undefined);
  assert.equal((await fetch(base+'/api/poem?id=wang-wuyixiang&surname=李')).status,404);
  assert.equal((await fetch(base+'/api/poem')).status,404);
  assert.equal((await(await fetch(base+'/api/poem?surname=马')).json()).poem.id,'ma-dengkehou');
  await fetch(base+'/api/materials');
  const catalog=await(await fetch(base+'/api/catalog')).json();assert.ok(catalog.poems.every(poem=>!('timing' in poem)));
  const html=await(await fetch(base+'/poem/index.html')).text();assert.match(html,/id="scene-loading"/);assert.match(html,/id="music-volume"[^>]+value="0.35"/);
  const manifest=JSON.parse(await readFile(new URL('../public/build/manifest.json',import.meta.url),'utf8'));
  for(const {url} of Object.values(manifest)){
    const script=await fetch(base+url);assert.equal(script.status,200);assert.equal(script.headers.get('cache-control'),'public, max-age=31536000, immutable');
    assert.equal(script.headers.get('content-encoding'),'gzip');
    const etag=script.headers.get('etag');assert.equal((await fetch(base+url,{headers:{'If-None-Match':etag}})).status,304);
    assert.equal((await fetch(base+url,{headers:{'Accept-Encoding':'gzip;q=0'}})).headers.get('content-encoding'),null);
    assert.ok(!(await script.text()).match(/\bfrom\s*['"]\//),'发布脚本不应再触发浏览器根路径模块瀑布');
  }
});

test('on-demand caching keeps other poems; only a complete manifest may prune unused media',async()=>{
  const listeners=new Map(),items=new Map();
  const cache={match:async url=>items.get(url)?.clone(),put:async(url,response)=>items.set(url,response),keys:async()=>[...items.keys()].map(url=>({url})),delete:async request=>items.delete(typeof request==='string'?request:request.url)};
  const self={location:{origin:'https://class.example'},addEventListener:(name,fn)=>listeners.set(name,fn)};
  const code=(await readFile(new URL('../public/sw.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');
  vm.runInNewContext(code,{self,caches:{open:async()=>cache},fetch:async()=>new Response('media'),URL});
  const old='https://class.example/media/'+'a'.repeat(64)+'.mp3',current='https://class.example/media/'+'b'.repeat(64)+'.webp';
  items.set(old,new Response('already-cached'));
  async function message(prune){let work;listeners.get('message')({data:{type:'CACHE_MATERIALS',urls:[current],prune},waitUntil:promise=>work=promise});await work;}
  await message(false);assert.ok(items.has(old));assert.ok(items.has(current));
  await message(true);assert.ok(!items.has(old));assert.ok(items.has(current));
});
