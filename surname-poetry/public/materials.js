import {cacheMaterials} from './cache-client.js';
const roster=['周','徐','王','文','何','张','江','陈','翁','邢','尹','贺','李','朱','肖','雷','马','廖','邓','汪','刘','于','洪','郭','栗','吴'];
function el(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;}
try{
 const response=await fetch('/api/catalog');if(!response.ok)throw Error('读取失败');const {poems}=await response.json();
 poems.sort((a,b)=>roster.indexOf(a.surnames[0])-roster.indexOf(b.surnames[0]));
 document.getElementById('summary').textContent=`本班 ${new Set(poems.flatMap(p=>p.surnames)).size} 个姓氏 · ${poems.length} 份诗画素材 · 只朗读含姓氏的选句`;
 for(const poem of poems){
  const card=el('article',null,'card'),image=el('img');image.src=poem.assets.background;image.loading='lazy';image.alt=poem.title+'儿童水墨背景';card.append(image);
  const body=el('div',null,'card-content'),heading=el('h2');heading.append(el('span',poem.surnames[0],'surname'),document.createTextNode(poem.title));body.append(heading);
  const verse=el('blockquote');poem.lines.forEach((line,i)=>{if(i)verse.append(el('br'));verse.append(document.createTextNode(line));});body.append(verse,el('p',`${poem.dynasty} · ${poem.author} ｜ ${poem.source.collection}`,'credit'));
  body.append(el('p',poem.interaction.description||'在诗中找到自己的姓，再完成图案互动。','description'));
  if(poem.teacherNote)body.append(el('p',poem.teacherNote,'warning'));if(poem.pronunciationNote)body.append(el('p',poem.pronunciationNote,'warning'));
  const audio=el('audio');audio.controls=true;audio.preload='none';audio.src=poem.assets.narration;audio.setAttribute('aria-label',`${poem.surnames[0]}姓朗诵试听`);body.append(audio);
  const source=el('a','查看诗文出处','source');source.href=poem.source.url;source.target='_blank';source.rel='noopener';body.append(source);
  const link=el('a','打开互动','play');link.href='/poem/index.html?'+new URLSearchParams({surname:poem.surnames[0],poem:poem.id});body.append(link);card.append(body);document.getElementById('cards').append(card);
 }
 const cache=el('p',null,'note');document.body.append(cache);cacheMaterials(poems,cache,{all:true});
}catch{document.getElementById('summary').textContent='素材尚未连接，请检查本地服务。';}
