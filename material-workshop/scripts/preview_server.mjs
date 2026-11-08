import http from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=await realpath(fileURLToPath(new URL('../preview/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.wav':'audio/wav','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname.split('/').some(x=>x.startsWith('.')))throw Error();
  const file=await realpath(path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname)));
  if(!file.startsWith(root+path.sep)||!types[path.extname(file)])throw Error();
  const info=await stat(file);if(!info.isFile())throw Error();
  const headers={'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
  let start=0,end=info.size-1,status=200;
  if(req.method==='GET'&&req.headers.range){
   const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
   if(!m){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
   start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;
   if(start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length']=info.size?end-start+1:0;res.writeHead(status,headers);
  if(req.method==='HEAD'||!info.size)res.end();else{const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);}
 }catch{res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.PREVIEW_PORT||8877);
server.listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${server.address().port}`));
for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>server.close(()=>process.exit(0)));
