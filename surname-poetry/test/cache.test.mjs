import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/server.mjs';
import {configuration} from '../src/recognition.mjs';
import {loadCatalog,loadRuntimeManifest} from '../src/catalog.mjs';
import {cachedRange,parseRange} from '../public/range.js';

test('optimized catalog preserves speech and shares identical music content addresses',async()=>{
  const [original,optimized,manifest]=await Promise.all([loadCatalog({optimized:false}),loadCatalog(),loadRuntimeManifest()]);
  assert.equal(optimized[0].assets.music,optimized[1].assets.music);
  assert.equal(new Set(optimized.map(poem=>poem.assets.music)).size,1,'26姓共享用户确认版配乐，缓存只下载一份');
  for(const poem of optimized){assert.equal(poem.musicVersion,3);assert.equal(poem.musicReviewStatus,'approved-by-user');}
  for(const poem of optimized){
    assert.ok(poem.assets.background.endsWith('.webp'));
    for(const kind of ['music','timing']){
      const source=original.find(item=>item.id===poem.id).assets[kind];
      assert.equal(manifest.assets[source].sourceSha256,manifest.assets[source].sha256);
    }
    const narration=manifest.assets[original.find(item=>item.id===poem.id).assets.narration];
    assert.ok(poem.assets.narration.endsWith('.mp3'));
    assert.ok(narration.bytes<narration.sourceBytes*.4,'课堂播放文件应显著小于原始WAV');
    assert.equal(narration.encoding.bitrate,96000);
    assert.ok(Math.abs(narration.encoding.encodedDurationSeconds-narration.encoding.sourceDurationSeconds)<.12);
  }
  assert.ok(manifest.totals.optimizedPoemBytes<manifest.totals.originalPoemBytes*.4);
});
test('cached audio range replies contain exactly the requested bytes and validators',async()=>{
  const bytes=new Uint8Array([0,1,2,3,4,5,6,7,8,9]);
  const response=()=>new Response(bytes,{headers:{'Content-Type':'audio/wav','ETag':'"a"','Content-Length':'10'}});
  const selected=await cachedRange(response(),'bytes=2-5');
  assert.equal(selected.status,206);assert.equal(selected.headers.get('Content-Range'),'bytes 2-5/10');
  assert.deepEqual([...new Uint8Array(await selected.arrayBuffer())],[2,3,4,5]);
  const suffix=await cachedRange(response(),'bytes=-3');assert.deepEqual([...new Uint8Array(await suffix.arrayBuffer())],[7,8,9]);
  assert.equal((await cachedRange(response(),'bytes=10-')).status,416);
  assert.equal((await cachedRange(response(),'bytes=2-4','"old"')).status,200);
  assert.equal(parseRange('bytes=0-3,7-9',10),null);
  assert.equal(parseRange('bytes=9007199254740993-',10),null);
});
test('HTTP caching reuses immutable assets, returns 304, and serves stale If-Range as full audio',async t=>{
  const app=createApp(configuration({}));await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>app.close(resolve)));
  const base=`http://127.0.0.1:${app.address().port}`;
  const {urls}=await(await fetch(base+'/api/cache-manifest')).json();
  assert.ok(urls.length>=8);assert.equal(urls.length,new Set(urls).size);
  const file=urls.find(url=>url.endsWith('.mp3'));
  const first=await fetch(base+file);assert.equal(first.status,200);
  assert.equal(first.headers.get('Cache-Control'),'public, max-age=31536000, immutable');
  const etag=first.headers.get('ETag');assert.ok(file.includes(etag.replaceAll('"','')));
  const unchanged=await fetch(base+file,{headers:{'If-None-Match':etag}});assert.equal(unchanged.status,304);assert.equal((await unchanged.arrayBuffer()).byteLength,0);
  const partial=await fetch(base+file,{headers:{Range:'bytes=50-99','If-Range':etag}});assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,50);
  const changed=await fetch(base+file,{headers:{Range:'bytes=50-99','If-Range':'"old"'}});assert.equal(changed.status,200);
  const shell=await fetch(base+'/');assert.equal(shell.headers.get('Cache-Control'),'no-cache');
  assert.equal((await fetch(base+'/',{headers:{'If-None-Match':shell.headers.get('ETag')}})).status,304);
  assert.equal((await fetch(base+'/sw.js')).headers.get('Cache-Control'),'no-cache');
  assert.equal((await fetch(base+'/api/config')).headers.get('Cache-Control'),'no-store');
});
