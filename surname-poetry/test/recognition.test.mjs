import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { configuration, validateImage, parseRecognition, createLimiter, authorized, sessionCookie, recognize } from '../src/recognition.mjs';
import { createApp } from '../src/server.mjs';

const sample = await readFile(new URL('../public/assets/poems/li-ganyu-jiangnan/orange-companion.png',import.meta.url));
// Header validation fixture: dimensions reduced without calling an upstream decoder.
const header = Buffer.from(sample.subarray(0,64));header.writeUInt32BE(512,16);header.writeUInt32BE(512,20);
const image='data:image/png;base64,'+header.toString('base64');
const config=()=>configuration({TOKENHUB_API_KEY:'test-private-key',CLASSROOM_ACCESS_CODE:'test-classroom',RECOGNITION_DAILY_LIMIT:'50'});

test('configuration protects production access and HTTPS model address',()=>{
  assert.throws(()=>configuration({NODE_ENV:'production'}));
  assert.throws(()=>configuration({TOKENHUB_BASE_URL:'http://bad.example/v1'}));
  assert.equal(config().model,'hy-vision-2.0-instruct');
});
test('validates format and dimensions, rejects remote image URLs and oversized inputs',()=>{
  assert.equal(validateImage(image),image);
  assert.throws(()=>validateImage('https://somewhere/image.png'));
  assert.throws(()=>validateImage('data:image/png;base64,'+Buffer.from('not an image').toString('base64')));
  const invalid=Buffer.from(header);invalid.writeUInt32BE(9000,16);
  assert.throws(()=>validateImage('data:image/png;base64,'+invalid.toString('base64')));
});
test('parses recognized and unclear, without restricting recognition to available surnames',()=>{
  assert.deepEqual(parseRecognition('{"status":"recognized","surname":"张"}'),{status:'recognized',surname:'张'});
  assert.deepEqual(parseRecognition('```json\n{"status":"unclear"}\n```'),{status:'unclear'});
  assert.throws(()=>parseRecognition('{"status":"recognized","surname":"李小明"}'));
  assert.throws(()=>parseRecognition('<script>alert(1)</script>'));
});
test('signed classroom sessions reject wrong code, tampering and missing cookie',()=>{
  const settings=config();
  assert.throws(()=>sessionCookie(settings,'wrong'));
  const cookie=sessionCookie(settings,'test-classroom').split(';')[0];
  assert.equal(authorized({headers:{cookie}},settings),true);
  assert.equal(authorized({headers:{cookie:cookie+'a'}},settings),false);
  assert.equal(authorized({headers:{}},settings),false);
});
test('limiter bounds concurrency, per-client rate and daily model calls',()=>{
  let clock=Date.UTC(2026,10,7);const limiter=createLimiter(3,()=>clock);
  const release=limiter.enter('a'),release2=limiter.enter('b');
  assert.throws(()=>limiter.enter('c'),e=>e.code==='BUSY');release();release2();
  limiter.enter('c')();assert.throws(()=>limiter.enter('d'),e=>e.code==='DAILY_LIMIT');
  clock+=86400_000;limiter.enter('d')();
  const rate=createLimiter(100,()=>clock);for(let i=0;i<8;i++)rate.enter('a')();
  assert.throws(()=>rate.enter('a'),e=>e.code==='RATE_LIMIT');
});
test('provider failures never expose upstream response or API credentials',async()=>{
  await assert.rejects(recognize(image,config(),async()=>new Response('test-private-key raw upstream error',{status:401})),error=>!error.message.includes('private-key')&&error.status===502);
});
test('HTTP flow enforces auth/origin, handles other surnames, range audio and safe errors',async t=>{
  let answer='{"status":"recognized","surname":"王"}', calls=0;
  const app=createApp(config(),async(url,options)=>{
    calls++;assert.equal(options.headers.Authorization,'Bearer test-private-key');
    const body=JSON.parse(options.body);assert.equal(body.messages[1].content[0].image_url.url,image);
    return Response.json({choices:[{message:{content:answer}}]});
  });
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>app.close(resolve)));
  const base=`http://127.0.0.1:${app.address().port}`;
  const post=(route,body,headers={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await fetch(base+'/')).status,200);
  const publicConfig=await(await fetch(base+'/api/config')).json();assert.equal(publicConfig.authorized,false);assert.equal('key' in publicConfig,false);
  assert.equal((await post('/api/recognize',{image})).status,401);assert.equal(calls,0);
  assert.equal((await post('/api/session',{code:'test-classroom'},{Origin:'https://other.example'})).status,403);
  const session=await post('/api/session',{code:'test-classroom'});assert.equal(session.status,200);
  const Cookie=session.headers.get('set-cookie').split(';')[0];
  let response=await post('/api/recognize',{image},{Cookie});assert.deepEqual(await response.json(),{status:'recognized',surname:'王',supported:true});
  answer='{"status":"recognized","surname":"赵"}';response=await post('/api/recognize',{image},{Cookie});assert.equal((await response.json()).supported,false);
  answer='{"status":"unclear"}';response=await post('/api/recognize',{image},{Cookie});assert.deepEqual(await response.json(),{status:'unclear'});
  answer='provider raw error test-private-key';response=await post('/api/recognize',{image},{Cookie});assert.equal(response.status,502);assert.ok(!(await response.text()).includes('private-key'));
  assert.equal((await post('/api/recognize',{image:'bad'},{Cookie})).status,400);
  assert.equal((await post('/api/recognize',null,{Cookie})).status,400);
  assert.equal((await fetch(base+'/api/recognize',{method:'POST',body:'{}',headers:{Cookie}})).status,415);
  assert.equal((await fetch(base+'/.env')).status,404);
  const materials=await(await fetch(base+'/api/materials')).json();assert.ok(materials.poems.length>=2);assert.equal(materials.poems[0].timing.lines.length,2);
  const audio=await fetch(base+'/assets/poems/wang-wuyixiang/narration.wav',{headers:{Range:'bytes=0-99'}});assert.equal(audio.status,206);assert.equal((await audio.arrayBuffer()).byteLength,100);
});
