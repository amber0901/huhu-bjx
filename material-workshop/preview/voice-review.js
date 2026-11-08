'use strict';
const container=document.getElementById('voices');
const descriptions={
 'teacher-403005':['A · 建议先听','女老师 · 云雅琴','较舒缓的老师带读，重点比较整句连贯和句尾呼吸。'],
 'soft-402001':['B · 温柔姐姐','温柔姐姐 · 云小团','比较温柔甜美的声音，整体节奏更轻快。'],
 'child-403000':['C · 小伙伴','小伙伴 · 云小朵','比较童声读诗的亲切感，整体节奏更轻快。']
};
document.addEventListener('play',event=>{if(event.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(audio=>{if(audio!==event.target)audio.pause();});},true);
fetch('materials.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
 const wang=data.poems.find(p=>p.id==='wang-wuyixiang');
 if(wang?.materialVersion>=4){container.replaceChildren();const message=document.createElement('p');message.textContent='已选定云小朵。新版只朗读后两句，节奏稍慢，并取消跟读邀请。';const link=document.createElement('a');link.href='/';link.textContent='打开最新两句素材';container.append(message,link);document.querySelector('details').hidden=true;return;}
 const review=wang?.voiceReview;
 if(!review)throw Error();
 container.replaceChildren();
 review.voices.forEach((voice,index)=>{
  const info=descriptions[voice.voiceId];
  const card=document.createElement('article');card.className='card'+(index===0?' recommended':'');
  const number=document.createElement('div');number.className='number';number.textContent=info[0];
  const heading=document.createElement('h2');heading.textContent=info[1];
  const description=document.createElement('p');description.textContent=info[2];
  card.append(number,heading,description);
  [['narration',`诗词朗诵 · ${voice.durationSeconds.toFixed(1)} 秒`],['guidance','朗诵后的跟读邀请']].forEach(([kind,label])=>{
   const caption=document.createElement('label');caption.textContent=label;
   const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=voice.assets[kind];audio.setAttribute('aria-label',`${info[1]}${kind==='narration'?'朗诵':'跟读邀请'}`);card.append(caption,audio);
  });
  const link=document.createElement('a');link.className='listen';link.href='/?voice='+encodeURIComponent(voice.voiceId);link.textContent='带画面试听 '+['A','B','C'][index];card.append(link);container.append(card);
 });
 document.getElementById('previous').src=review.previous.assets.narration;
}).catch(()=>{container.textContent='试听素材尚未准备好，请先运行预览构建脚本。';});
