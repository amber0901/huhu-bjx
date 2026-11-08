import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { loadCatalog, loadRuntimeManifest, publicRoot } from './catalog.mjs';
import { createHash } from 'node:crypto';
import { parseRange } from '../public/range.js';
import { ApiError, configuration, authorized, sessionCookie, checkOrigin, readJson, validateImage, createLimiter, recognize } from './recognition.mjs';

const types = {
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function json(req, res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(req.method === 'HEAD' ? undefined : body);
}

const validators=new Map();
async function serveFile(req, res, pathname) {
  if (pathname.split('/').some((part) => part.startsWith('.'))) return false;
  const candidate = path.resolve(publicRoot, '.' + pathname);
  const prefix = publicRoot + path.sep;
  if (!candidate.startsWith(prefix)) return false;
  let file;
  let info;
  try {
    file = await realpath(candidate);
    if (!file.startsWith(prefix)) return false;
    info = await stat(file);
    if (!info.isFile()) return false;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
  const signature=info.size+':'+info.mtimeMs;
  let validator=validators.get(file);
  if(!validator||validator.signature!==signature){
    validator={signature,etag:'"'+createHash('sha256').update(await readFile(file)).digest('hex')+'"'};
    validators.set(file,validator);
  }
  const hashed=/^\/media\/[a-f0-9]{64}\.(webp|wav|mp3|json)$/.test(pathname);
  const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'ETag':validator.etag, 'Last-Modified':info.mtime.toUTCString(), 'Cache-Control':hashed?'public, max-age=31536000, immutable':'no-cache' };
  if(pathname==='/sw.js')headers['Service-Worker-Allowed']='/';
  const tags=(req.headers['if-none-match']||'').split(',').map(value=>value.trim().replace(/^W\//,''));
  if(tags.includes(validator.etag)||tags.includes('*')){
    res.writeHead(304,headers);res.end();return true;
  }
  let start = 0;
  let end = info.size - 1;
  let status = 200;
  // HEAD 返回完整资源头；GET 支持浏览器对音频的单区间请求。
  if (req.method === 'GET' && req.headers.range && (!req.headers['if-range']||req.headers['if-range']===validator.etag)) {
    const range=parseRange(req.headers.range,info.size);
    if (!range) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      res.end();
      return true;
    }
    start=range.start;end=range.end;
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length'] = info.size === 0 ? 0 : end - start + 1;
  res.writeHead(status, headers);
  if (req.method === 'HEAD' || info.size === 0) res.end();
  else {
    const stream = createReadStream(file, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  }
  return true;
}

export function createApp(config = configuration(), fetcher = fetch) {
const limiter = createLimiter(config.dailyLimit);
const attempts = new Map();
return http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (req.method === 'POST' && ['/api/recognize','/api/session'].includes(pathname)) {
      checkOrigin(req);
      const client = req.socket.remoteAddress || 'unknown';
      if (pathname === '/api/session') {
        const now = Date.now(), previous = attempts.get(client);
        if (previous && now - previous.start < 60_000 && previous.count >= 5) throw new ApiError(429, 'RATE_LIMIT', '请稍后再输入课堂口令', 60);
        const body = await readJson(req, 1024);
        if (typeof body.code !== 'string' || body.code.length > 200) throw new ApiError(400, 'CODE', '请输入课堂口令');
        attempts.set(client, previous && now-previous.start < 60_000 ? {...previous,count:previous.count+1} : {start:now,count:1});
        if (attempts.size > 1000) for (const [key, value] of attempts) if (now-value.start > 60_000) attempts.delete(key);
        const cookie = sessionCookie(config, body.code);
        attempts.delete(client);
        res.setHeader('Set-Cookie', cookie);
        return json(req, res, 200, {ok:true});
      }
      if (!authorized(req, config)) throw new ApiError(401, 'SESSION', '请老师打开课堂');
      if (!config.key) throw new ApiError(503, 'NOT_CONFIGURED', '请老师先连接识别服务');
      const body = await readJson(req);
      const image = validateImage(body.image);
      const release = limiter.enter(client);
      const controller = new AbortController();
      res.on('close', () => { if (!res.writableEnded) controller.abort(); });
      try {
        const result = await recognize(image, config, fetcher, controller.signal);
        const catalog = await loadCatalog();
        return json(req, res, 200, {...result, ...(result.surname ? {supported:catalog.some(poem=>poem.surnames.includes(result.surname))} : {})});
      } finally { release(); }
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return json(req, res, 405, { error: '不支持的请求方法' });
    }
    if (pathname === '/api/health') return json(req, res, 200, { status: 'ok', service: 'surname-poetry' });
    if (pathname === '/api/config') return json(req, res, 200, {visionConfigured:Boolean(config.key),authRequired:Boolean(config.accessCode),authorized:authorized(req,config)});
    if (pathname === '/api/catalog') return json(req, res, 200, { poems: await loadCatalog() });
    if (pathname === '/api/cache-manifest') {
      const manifest=await loadRuntimeManifest();
      return json(req,res,200,{urls:[...new Set([...Object.values(manifest.assets).map(item=>item.url),manifest.homeBackground.url])]});
    }
    if (pathname === '/api/materials') {
      const poems = await loadCatalog();
      for (const poem of poems) poem.timing = JSON.parse(await readFile(path.resolve(publicRoot,'.'+poem.assets.timing),'utf8'));
      return json(req, res, 200, {poems});
    }
    if (await serveFile(req, res, pathname === '/' ? '/index.html' : pathname)) return;
    return json(req, res, 404, { error: '未找到资源' });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
      return json(req,res,error.status,{error:error.message,code:error.code});
    }
    if (error instanceof URIError) return json(req, res, 400, { error: '请求路径无效' });
    // 不将异常、配置值或凭据返回给终端。
    return json(req, res, 500, { error: '服务暂时不可用' });
  }
});
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
const server = createApp();
const port = Number(process.env.PORT || 3000);
server.requestTimeout = 40_000;
server.headersTimeout = 10_000;
server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`surname-poetry listening on port ${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
}
