import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalog} from '../src/catalog.mjs';
import {sceneGames} from '../public/poem/playground.js';
const roster=['周','徐','王','文','何','张','江','陈','翁','邢','尹','贺','李','朱','肖','雷','马','廖','邓','汪','刘','于','洪','郭','栗','吴'];
test('class materials cover the confirmed 26 literal surnames, with two spoken lines and distinct implemented activities',async()=>{
 const poems=await loadCatalog();assert.equal(poems.length,26);
 assert.deepEqual(poems.flatMap(p=>p.surnames).sort(),[...roster].sort());
 const games=new Set();
 for(const poem of poems){
  const surname=poem.surnames[0];assert.equal(poem.lines.length,2);assert.ok(poem.lines.join('').includes(surname),surname+'必须出现在展示正文');
  assert.equal(poem.followAlong,false);assert.equal(poem.voice.id,403000);assert.equal(poem.voice.speed,-.65);
  assert.equal(poem.interaction.targetSurname,surname);assert.ok(!games.has(poem.interaction.game),'每个姓氏应有独立玩法');games.add(poem.interaction.game);
  assert.equal(poem.interactionTiming,'after-narration');assert.equal(poem.interaction.autoDemo,true);assert.ok(poem.interaction.childGoal);
  assert.ok(poem.interaction.cueWords.every(word=>poem.lines.join('').includes(word)));
  if(poem.interactionMode==='surname-poem-play')assert.ok(sceneGames.has(poem.interaction.game));
  assert.equal(poem.musicProduction.vocals,false);assert.ok(poem.assets.music.endsWith('.mp3'));
 }
 const xiao=poems.find(p=>p.surnames.includes('肖'));assert.ok(xiao.lines.join('').includes('肖'));assert.ok(!xiao.lines.join('').includes('萧'));
 const li=poems.find(p=>p.surnames.includes('栗'));assert.ok(li.lines.join('').includes('栗'));assert.ok(!li.lines.join('').includes('粟'));
 const ma=poems.find(p=>p.surnames.includes('马'));assert.equal(ma.id,'ma-dengkehou');assert.equal(ma.title,'登科后');assert.equal(ma.author,'孟郊');
 assert.deepEqual(ma.lines,['春风得意马蹄疾，','一日看尽长安花。']);assert.equal(ma.interaction.game,'horse-flowers');assert.ok(ma.assets.companion);
 assert.ok(!poems.some(p=>p.id==='ma-changgan'),'旧版马素材不应再参与随机选择');
});
