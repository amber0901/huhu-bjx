// The same single-range semantics for cached audio and the HTTP server.
export function parseRange(value,size) {
  const match=/^bytes=(\d*)-(\d*)$/.exec(value);
  if(!match || (!match[1]&&!match[2]) || size<=0)return null;
  let start=0,end=size-1;
  if(!match[1]) {
    const suffix=Number(match[2]);
    if(!Number.isSafeInteger(suffix)||suffix<=0)return null;
    start=Math.max(0,size-suffix);
  } else {
    start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;
  }
  return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start<=end&&start<size ? {start,end}:null;
}
export async function cachedRange(response,range,ifRange) {
  // A mismatching validator requests a full representation, per If-Range.
  if(ifRange && ifRange!==response.headers.get('ETag'))return response;
  const bytes=await response.arrayBuffer(),selected=parseRange(range,bytes.byteLength);
  if(!selected)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
  const headers=new Headers(response.headers);
  headers.set('Content-Range',`bytes ${selected.start}-${selected.end}/${bytes.byteLength}`);
  headers.set('Content-Length',String(selected.end-selected.start+1));
  headers.set('Accept-Ranges','bytes');
  return new Response(bytes.slice(selected.start,selected.end+1),{status:206,headers});
}
