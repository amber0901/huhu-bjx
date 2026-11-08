import {cachedRange} from '/range.js';
const CACHE='baijiaxing-media-v1';
const pending=new Map();
const mediaPath=/^\/media\/[a-f0-9]{64}\.(?:webp|mp3|wav|json)$/;
function allowed(value) {
  try {const url=new URL(value,self.location.origin);return url.origin===self.location.origin&&mediaPath.test(url.pathname)&&!url.search?url.href:null;}catch{return null;}
}
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function fullAsset(url) {
  const cache=await caches.open(CACHE),hit=await cache.match(url);
  if(hit)return {response:hit,hit:true};
  if(!pending.has(url))pending.set(url,(async()=>{
    const response=await fetch(url,{credentials:'same-origin'});
    if(response.status!==200)throw Error('Asset unavailable');
    await cache.put(url,response.clone());
    return response;
  })().finally(()=>pending.delete(url)));
  return {response:(await pending.get(url)).clone(),hit:false};
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=allowed(event.request.url);if(!url)return;
  event.respondWith((async()=>{
    try {
      const {response}=await fullAsset(url),range=event.request.headers.get('Range');
      return range?cachedRange(response,range,event.request.headers.get('If-Range')):response;
    }catch{return fetch(event.request);}
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type!=='CACHE_MATERIALS'||!Array.isArray(event.data.urls))return;
  const urls=[...new Set(event.data.urls.map(allowed).filter(Boolean))].slice(0,500);
  if(!urls.length)return;
  event.waitUntil((async()=>{
    let completed=0,hits=0,failed=0,next=0;
    const notify=()=>event.source?.postMessage({type:'MATERIAL_CACHE_STATUS',total:urls.length,completed,hits,failed});
    async function worker(){while(next<urls.length){const url=urls[next++];try{const item=await fullAsset(url);completed++;if(item.hit)hits++;}catch{failed++;}notify();}}
    await Promise.all([worker(),worker()]);
    // Only prune when a complete new manifest is cached. Recognition and all APIs
    // bypass this worker, and handwritten PNG data is never put into CacheStorage.
    if(failed===0){const cache=await caches.open(CACHE),keep=new Set(urls);for(const key of await cache.keys())if(!keep.has(key.url))await cache.delete(key);}
  })());
});
