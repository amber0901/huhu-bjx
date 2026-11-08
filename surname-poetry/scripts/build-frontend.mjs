// Build on a development computer, then commit the generated browser files.
// Docker needs only the generated files and never installs the build tool.
import {build} from 'esbuild';
import {readFile,writeFile,readdir,unlink,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const entries={app:'public/app.js',poem:'public/poem/app.js',materials:'public/materials.js'};
const result=await build({entryPoints:entries,bundle:true,format:'esm',minify:true,target:'chrome92',
  outdir:'public/build',entryNames:'[name]-[hash]',metafile:true,logLevel:'warning',
  plugins:[{name:'browser-root',setup(api){api.onResolve({filter:/^\//},args=>({path:path.join(root,'public',args.path)}));}}],
});
const manifest={};
for(const [output,info] of Object.entries(result.metafile.outputs)){
  const name=Object.keys(entries).find(key=>entries[key]===info.entryPoint);
  if(name){
    const sourceHashes={};
    for(const input of Object.keys(info.inputs))sourceHashes[input.replace(/^public\//,'')]=createHash('sha256').update(await readFile(input)).digest('hex');
    manifest[name]={url:'/'+output.replace(/^public\//,''),bytes:info.bytes,sha256:createHash('sha256').update(await readFile(output)).digest('hex'),sourceHashes};
  }
}
const pages={app:'public/index.html',poem:'public/poem/index.html',materials:'public/materials.html'};
for(const [name,page] of Object.entries(pages)){
  if(!manifest[name])throw Error('Missing bundle: '+name);
  const html=await readFile(page,'utf8');
  const updated=html.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/,`<script src="${manifest[name].url}" type="module"></script>`);
  if(updated===html&&!html.includes(manifest[name].url))throw Error('Missing entry script: '+page);
  await writeFile(page,updated);
}
await mkdir('public/build',{recursive:true});
await writeFile('public/build/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const keep=new Set(Object.values(manifest).map(item=>path.basename(item.url)));
for(const name of await readdir('public/build'))if(name.endsWith('.js')&&!keep.has(name))await unlink('public/build/'+name);
console.log(JSON.stringify(manifest,null,2));
