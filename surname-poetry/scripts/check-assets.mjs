import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import { assetNames, loadCatalog, publicRoot } from '../src/catalog.mjs';

try {
  const poems = await loadCatalog({optimized:false});
  for (const poem of poems) {
    if (!Array.isArray(poem.lines) || poem.lines.length === 0 || !poem.lines.every((line) => typeof line === 'string' && line.trim())) throw new Error(`${poem.id}: 缺少诗句`);
    if (!Array.isArray(poem.surnames) || !poem.surnames.length || !poem.surnames.every((surname) => typeof surname === 'string' && surname.trim() && poem.lines.some((line) => line.includes(surname)))) throw new Error(`${poem.id}: 姓氏未出现在诗句正文`);
    const prefix = path.join(publicRoot, 'assets/poems', poem.id) + path.sep;
    for (const key of assetNames) {
      if (['guidance', 'companion'].includes(key) && !poem.assets[key]) continue;
      const file = path.resolve(publicRoot, '.' + poem.assets[key]);
      const actual = await realpath(file);
      if (!file.startsWith(prefix) || !actual.startsWith(prefix) || !(await stat(file)).isFile() || (await stat(file)).size === 0) throw new Error(`${poem.id}: 素材不存在或路径错误 ${key}`);
    }
    const timing = JSON.parse(await readFile(path.resolve(publicRoot, '.' + poem.assets.timing), 'utf8'));
    if (timing.unit !== 'seconds' || !Array.isArray(timing.lines) || timing.lines.length !== poem.lines.length) throw new Error(`${poem.id}: 时间轴格式错误`);
    let previous = 0;
    timing.lines.forEach((line, index) => {
      if (line.text !== poem.lines[index] || !Number.isFinite(line.start) || !Number.isFinite(line.end) || line.start < previous || line.end <= line.start) throw new Error(`${poem.id}: 第 ${index + 1} 句时间轴无效`);
      previous = line.end;
    });
  }
  await loadCatalog(); // Validate prepared content addresses and original hashes.
  const frontend=JSON.parse(await readFile(path.join(publicRoot,'build/manifest.json'),'utf8'));
  for(const item of Object.values(frontend)){
    if(!/^\/build\/[a-z-]+-[A-Z0-9]{8}\.js$/i.test(item.url))throw Error('浏览器脚本地址错误');
    const bytes=await readFile(path.join(publicRoot,item.url));
    if(createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('浏览器脚本已改变，请运行 npm run build');
    for(const [source,expected] of Object.entries(item.sourceHashes)){
      const file=path.resolve(publicRoot,source);
      if(!file.startsWith(publicRoot+path.sep)||createHash('sha256').update(await readFile(file)).digest('hex')!==expected)throw Error('前端源码已改变，请运行 npm run build');
    }
  }
  console.log(`素材结构检查通过：${poems.length} 首已发布诗歌。`);
  if (!poems.length) console.log('当前没有正式素材；这不代表素材制作已完成。');
} catch (error) {
  console.error(`素材检查失败：${error.message}`);
  process.exitCode = 1;
}
