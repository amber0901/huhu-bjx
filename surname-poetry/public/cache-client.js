let preparation;
const subscribed=new WeakSet();
export function cacheMaterials(_poems,statusElement) {
  if(!statusElement)return;
  if(!('serviceWorker' in navigator)||!window.isSecureContext){
    statusElement.textContent='浏览器长期缓存已启用；HTTPS 可额外启用本机素材缓存。';return;
  }
  if(!subscribed.has(statusElement))navigator.serviceWorker.addEventListener('message',event=>{
    const data=event.data;
    if(data?.type!=='MATERIAL_CACHE_STATUS')return;
    statusElement.textContent=data.failed ? `本机素材缓存 ${data.completed}/${data.total}，部分文件稍后重试。` : data.completed===data.total ? `本机素材已缓存 ${data.total}/${data.total}（本次直接复用 ${data.hits} 个）。` : `正在准备素材缓存 ${data.completed}/${data.total}…`;
  });
  subscribed.add(statusElement);
  preparation ||= (async()=>{
    const registration=await navigator.serviceWorker.register('/sw.js',{type:'module',updateViaCache:'none'});
    await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),10000))]);
    const response=await fetch('/api/cache-manifest');if(!response.ok)throw Error();
    const {urls}=await response.json();
    if(!registration.active)throw Error();
    registration.active.postMessage({type:'CACHE_MATERIALS',urls});
  })();
  preparation.catch(()=>{statusElement.textContent='浏览器缓存仍可用；本机素材缓存暂不可用。';preparation=undefined;});
}
