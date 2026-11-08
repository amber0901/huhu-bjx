import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicRoot = path.join(root, 'public');
export const assetNames = ['background', 'narration', 'timing', 'music', 'guidance', 'companion'];
export const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let rawCatalog, optimizedCatalog, manifestPromise;
export async function loadRuntimeManifest() {
  manifestPromise ||= (async()=>{
    const manifest=JSON.parse(await readFile(path.join(root,'data/runtime-assets.json'),'utf8'));
    if(manifest.schemaVersion!==1||!manifest.assets||!manifest.homeBackground)throw Error('缺少运行时素材清单');
    const checked=new Set();
    for(const item of [...Object.values(manifest.assets),manifest.homeBackground]){
      if(!/^\/media\/[a-f0-9]{64}\.(webp|mp3|wav|json)$/.test(item.url))throw Error('运行时素材路径错误');
      if(checked.has(item.url))continue;
      const bytes=await readFile(path.join(publicRoot,item.url));
      const hash=createHash('sha256').update(bytes).digest('hex');
      if(hash!==item.sha256||!item.url.includes(hash))throw Error('运行时素材哈希错误');
      checked.add(item.url);
    }
    return manifest;
  })();
  return manifestPromise;
}
async function readCatalog() {
  const catalog = JSON.parse(await readFile(path.join(root, 'data/catalog.json'), 'utf8'));
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.poems)) {
    throw new Error('素材目录格式错误');
  }
  const seen = new Set();
  const poems = [];
  for (const entry of catalog.poems) {
    if (!idPattern.test(entry.id) || seen.has(entry.id)) throw new Error('诗歌 ID 无效或重复');
    seen.add(entry.id);
    const base = `/assets/poems/${entry.id}/`;
    const poem = JSON.parse(await readFile(path.join(publicRoot, base, 'poem.json'), 'utf8'));
    if (poem.id !== entry.id || poem.status !== 'ready') throw new Error('诗歌尚未发布');
    poems.push({ ...poem, assets: Object.fromEntries(assetNames.filter((key) => poem.assets[key]).map((key) => [key, base + poem.assets[key]])) });
  }
  return poems;
}
export async function loadCatalog({optimized=true}={}) {
  rawCatalog ||= readCatalog();
  if(!optimized)return rawCatalog;
  optimizedCatalog ||= (async()=>{
    const [poems,manifest]=await Promise.all([rawCatalog,loadRuntimeManifest()]);
    return Promise.all(poems.map(async poem=>{
      const assets={};
      for(const [kind,url] of Object.entries(poem.assets)){
        const item=manifest.assets[url];
        if(!item)throw Error('素材已变更，请重新运行素材压缩流程');
        const hash=createHash('sha256').update(await readFile(path.join(publicRoot,url))).digest('hex');
        if(hash!==item.sourceSha256)throw Error('原始素材已更新，请重新生成运行时素材');
        assets[kind]=item.url;
      }
      return {...poem,assets};
    }));
  })();
  return optimizedCatalog;
}
