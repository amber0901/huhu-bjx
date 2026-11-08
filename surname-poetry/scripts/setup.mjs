import { readFile, writeFile, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const file = new URL('../.env',import.meta.url);
let text;
try { text = await readFile(file,'utf8'); }
catch(error) {if(error.code!=='ENOENT')throw error;text=await readFile(new URL('../.env.example',import.meta.url),'utf8');}
const match=/^CLASSROOM_ACCESS_CODE=(.*)$/m.exec(text);
if (!match || !match[1].trim() || ['""',"''"].includes(match[1].trim())) {
  const entry='CLASSROOM_ACCESS_CODE='+randomBytes(18).toString('base64url');
  text=match?text.replace(/^CLASSROOM_ACCESS_CODE=.*$/m,entry):text.trimEnd()+'\n'+entry+'\n';
  await writeFile(file,text,{mode:0o600});
}
await chmod(file,0o600);
console.log('本地 .env 已准备好。请在该文件中填写模型密钥，并查看课堂口令；此命令不输出密钥或口令。');
