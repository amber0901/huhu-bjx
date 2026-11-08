let preparation;
const subscribed=new WeakSet(),queued=new Set();
export function cacheMaterials(poems,statusElement,{all=false}={}) {
  if(!statusElement)return;
  if(!('serviceWorker' in navigator)||!window.isSecureContext){
    statusElement.textContent='浏览器长期缓存已启用；HTTPS 可额外启用本机素材缓存。';return;
  }
  if(!subscribed.has(statusElement))navigator.serviceWorker.addEventListener('message',event=>{
    const data=event.data;
    if(data?.type!=='MATERIAL_CACHE_STATUS')return;
    statusElement.textContent=data.failed?`本机素材缓存 ${data.completed}/${data.total}，部分文件稍后重试。`:data.completed===data.total?`本机素材已缓存 ${data.total}/${data.total}（本次直接复用 ${data.hits} 个）。`:`正在准备素材缓存 ${data.completed}/${data.total}…`;
  });
  subscribed.add(statusElement);
  preparation ||= (async()=>{
    const registration=await navigator.serviceWorker.register('/sw.js',{type:'module',updateViaCache:'none'});
    await navigator.serviceWorker.ready;
    if(!registration.active)throw Error();
    return registration;
  })();
  if(!poems.length&&!all)statusElement.textContent='素材在使用时自动缓存。';
  preparation.then(async registration=>{
    let urls=[...new Set(poems.flatMap(poem=>Object.values(poem.assets||{})))];
    if(all){const response=await fetch('/api/cache-manifest');if(!response.ok)throw Error();urls=(await response.json()).urls;}
    if(!urls.length)return;
    const key=urls.join('\n');if(queued.has(key))return;queued.add(key);
    registration.active.postMessage({type:'CACHE_MATERIALS',urls,prune:all});
  }).catch(()=>{statusElement.textContent='浏览器缓存仍可用；本机素材缓存暂不可用。';preparation=undefined;});
}
