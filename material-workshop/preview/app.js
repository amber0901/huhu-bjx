'use strict';

const $ = id => document.getElementById(id);
const narration = $('narration'), music = $('music'), scene = $('scene'), bird = $('bird');
const startPosition = {x: 74, y: 84};
const houseSlots = [65, 79, 92];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let poems = [], poem, surname, phase = 'idle', found = false, atHome = false;
const companionLabel = () => poem?.interaction.companionLabel || '小燕子';
const isBuildGame = () => poem?.interaction.game === 'assemble-character';
const placedParts = new Set();
let partDrag = null, partClickUntil = 0;
let raf, fadeRaf, flightTimer, hintTimer, feedbackTimer, generation = 0;
let drag = null, suppressClickUntil = 0, previousTargetSlot = -1;

const format = time => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;

function setPhase(next, message) {
  phase = next;
  scene.dataset.phase = next;
  $('phase').textContent = message;
  $('play').textContent = next === 'narrating' ? 'Ⅱ 暂停' : next === 'paused' ? '▶ 继续' : '▶ 听一听';
}

function activityHint(message) {
  scene.dataset.stage = atHome ? 'complete' : found ? 'match' : 'discover';
  $('phase').textContent = message || (isBuildGame() ? (atHome ? '木和子拼成了李' : found ? '把木放上面，子放下面，拼成李字' : '先在诗里找到李字') : atHome
    ? `找到“${surname}”字的家啦！`
    : found ? `找“${surname}”字的小屋` : `先点诗里的“${surname}”字`);
}

function stopAudio() {
  generation++;
  cancelAnimationFrame(raf);
  cancelAnimationFrame(fadeRaf);
  narration.pause();
  music.pause();
}

function positionBird(position) {
  bird.style.left = `${position.x}%`;
  bird.style.top = `${position.y}%`;
}

function paint() {
  cancelAnimationFrame(raf);
  if (!poem) return;
  const time = narration.currentTime;
  document.querySelectorAll('.verse').forEach((line, index) => {
    const timing = poem.timing.lines[index];
    line.classList.toggle('current', time >= timing.start && time < timing.end);
    line.classList.toggle('heard', time >= timing.end);
  });
  $('seek').max = narration.duration || 1;
  $('seek').value = time;
  $('clock').textContent = `${format(time)} / ${format(narration.duration || 0)}`;
  if (phase === 'narrating') raf = requestAnimationFrame(paint);
}

function fadeMusic() {
  cancelAnimationFrame(fadeRaf);
  const run = generation, begin = performance.now(), volume = music.volume;
  function step(now) {
    if (run !== generation) return;
    const fraction = Math.min(1, (now - begin) / 900);
    music.volume = volume * (1 - fraction);
    if (fraction < 1) fadeRaf = requestAnimationFrame(step);
    else music.pause();
  }
  fadeRaf = requestAnimationFrame(step);
}

async function start(from = 0) {
  stopAudio();
  const run = generation;
  narration.currentTime = from;
  setPhase('loading', '准备听诗');
  if ($('music-toggle').checked) {
    music.volume = Number($('music-volume').value);
    music.play().catch(() => {});
  }
  try {
    await narration.play();
    if (run !== generation) return;
    setPhase('narrating', '正在听诗');
    paint();
  } catch {
    if (run === generation) {
      music.pause();
      setPhase('idle', '点听一听再试一次');
      activityHint('点“听一听”再试一次');
    }
  }
}

function sparkle(x, y) {
  const layer = $('celebration');
  layer.replaceChildren();
  for (let index = 0; index < 7; index++) {
    const leaf = document.createElement('span');
    leaf.className = 'petal';
    leaf.style.left = `${x}%`;
    leaf.style.top = `${y}%`;
    leaf.style.setProperty('--dx', `${(index - 3) * 24}px`);
    leaf.style.setProperty('--dy', `${-35 - Math.abs(index - 3) * 10}px`);
    leaf.style.setProperty('--turn', `${index * 47}deg`);
    leaf.style.background = ['#e7b76e', '#b7cb91', '#efc6a5'][index % 3];
    layer.append(leaf);
  }
}

function showHint() {
  clearTimeout(hintTimer);
  document.body.classList.add('hinting');
  activityHint(found ? (isBuildGame() ? '木在上，子在下，拼成诗句里的李字' : `找到和诗句中“${surname}”字相同的门牌`) : `诗里藏着“${surname}”字`);
  hintTimer = setTimeout(() => document.body.classList.remove('hinting'), 1500);
}

function findSurname() {
  if (!found) {
    found = true;
    scene.dataset.found = 'true';
    $('homes').hidden = isBuildGame();
    $('character-game').hidden = !isBuildGame();
    bird.setAttribute('aria-label', isBuildGame() ? '拼好李字后，小橘子会出现' : `${companionLabel()}，拖到${surname}字的小屋，也可点小屋选择`);
    sparkle(25, 37);
  }
  activityHint();
  if (phase !== 'narrating' && phase !== 'loading') start();
}

function makeHomes() {
  const choices = [...new Set([surname, ...poem.interaction.homeChoices])];
  if (choices.length !== 3) throw Error('姓氏选项必须包含三个不同的字');
  for (let index = choices.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [choices[index], choices[other]] = [choices[other], choices[index]];
  }
  if (choices.indexOf(surname) === previousTargetSlot) {
    const other = (previousTargetSlot + 1 + Math.floor(Math.random() * 2)) % choices.length;
    [choices[previousTargetSlot], choices[other]] = [choices[other], choices[previousTargetSlot]];
  }
  previousTargetSlot = choices.indexOf(surname);
  $('homes').replaceChildren(...choices.map((label, index) => {
    const house = document.createElement('button');
    house.className = 'home';
    house.dataset.surname = label;
    house.style.left = `${houseSlots[index]}%`;
    house.setAttribute('aria-label', `${label}字的小屋`);
    house.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 29 32 9l24 20M16 26v29h32V26"/></svg>';
    const character = document.createElement('span');
    character.textContent = label;
    house.append(character);
    house.onclick = () => attemptHome(house);
    return house;
  }));
}

function houseDestination(house) {
  const box = scene.getBoundingClientRect(), target = house.getBoundingClientRect();
  return {x: (target.x + target.width / 2 - box.x) / box.width * 100,
    y: poem.interaction.motif === 'orange' ? (target.bottom - box.y) / box.height * 100 + 4 : (target.y - box.y) / box.height * 100 + 1};
}

function finishHome(house, position) {
  atHome = true;
  scene.dataset.home = 'true';
  scene.classList.remove('flying');
  house.classList.remove('ready');
  house.classList.add('correct');
  bird.setAttribute('aria-label', `已找到${surname}字的小屋`);
  positionBird(position);
  sparkle(position.x, position.y);
  activityHint();
  $('phase').textContent = `找到了和自己姓氏相同的门牌：${surname}`;
}

function attemptHome(house) {
  if (atHome || scene.classList.contains('flying')) return;
  clearTimeout(feedbackTimer);
  document.querySelectorAll('.home').forEach(item => item.classList.remove('try-again', 'ready'));
  if (!found) return showHint();
  if (house.dataset.surname !== surname) {
    house.classList.add('try-again');
    positionBird(startPosition);
    showHint();
    activityHint(`这是“${house.dataset.surname}”，找“${surname}”`);
    feedbackTimer = setTimeout(() => house.classList.remove('try-again'), 900);
    return;
  }
  const destination = houseDestination(house);
  scene.classList.add('flying');
  positionBird(destination);
  clearTimeout(flightTimer);
  flightTimer = setTimeout(() => finishHome(house, destination), reducedMotion.matches ? 0 : 900);
}

function reset() {
  stopAudio();
  clearTimeout(flightTimer);
  clearTimeout(feedbackTimer);
  clearTimeout(hintTimer);
  narration.currentTime = 0;
  music.currentTime = 0;
  found = false;
  atHome = false;
  drag = null;
  scene.classList.remove('flying', 'dragging');
  document.body.classList.remove('hinting');
  scene.dataset.home = 'false';
  scene.dataset.found = 'false';
  $('homes').hidden = true;
  $('celebration').replaceChildren();
  $('character-game').hidden = true;
  $('character-target').classList.remove('complete');
  scene.dataset.assembled = 'false';
  placedParts.clear(); partDrag = null; partClickUntil = 0;
  document.querySelectorAll('.character-part').forEach(part => {part.hidden=false;part.disabled=false;part.style.transform='';part.classList.remove('retry');});
  document.querySelectorAll('.part-slot').forEach(slot => {slot.dataset.filled='false';slot.classList.remove('ready');});
  if (isBuildGame()) $('homes').replaceChildren(); else makeHomes();
  positionBird(startPosition);
  bird.setAttribute('aria-label', `${companionLabel()}，先在诗里找到${surname}字`);
  activityHint();
  setPhase('idle', `先在诗里找到${surname}字`);
  paint();
}

function hitHouse(event) {
  const hits = [...document.querySelectorAll('.home')].map(house => ({house, box: house.getBoundingClientRect()}))
    .filter(({box}) => event.clientX >= box.left - 12 && event.clientX <= box.right + 12
      && event.clientY >= box.top - 12 && event.clientY <= box.bottom + 12);
  hits.sort((a, b) => Math.hypot(event.clientX - a.box.x - a.box.width / 2, event.clientY - a.box.y - a.box.height / 2)
    - Math.hypot(event.clientX - b.box.x - b.box.width / 2, event.clientY - b.box.y - b.box.height / 2));
  return hits[0]?.house;
}

bird.addEventListener('pointerdown', event => {
  if (isBuildGame()) {if (!atHome) showHint(); return;}
  if (atHome || scene.classList.contains('flying')) return;
  if (!found) return showHint();
  drag = {id: event.pointerId, x: event.clientX, y: event.clientY, moved: false};
  bird.setPointerCapture(event.pointerId);
});
bird.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) drag.moved = true;
  if (!drag.moved) return;
  scene.classList.add('dragging');
  const box = scene.getBoundingClientRect();
  positionBird({x: Math.max(6, Math.min(94, (event.clientX - box.left) / box.width * 100)),
    y: Math.max(12, Math.min(90, (event.clientY - box.top) / box.height * 100))});
  const candidate = hitHouse(event);
  document.querySelectorAll('.home').forEach(house => house.classList.toggle('ready', house === candidate));
});
bird.addEventListener('pointerup', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const moved = drag.moved, candidate = moved ? hitHouse(event) : undefined;
  drag = null;
  suppressClickUntil = Date.now() + 350;
  scene.classList.remove('dragging');
  document.querySelectorAll('.home').forEach(house => house.classList.remove('ready'));
  if (candidate) attemptHome(candidate);
  else {positionBird(startPosition); showHint();}
});
bird.addEventListener('pointercancel', () => {
  drag = null;
  scene.classList.remove('dragging');
  document.querySelectorAll('.home').forEach(house => house.classList.remove('ready'));
  if (!atHome) positionBird(startPosition);
});
bird.onclick = () => {if (Date.now() >= suppressClickUntil && !atHome) showHint();};
$('help-home').onclick = showHint;
$('reset').onclick = reset;

$('play').onclick = async () => {
  if (phase === 'loading') return;
  if (phase === 'narrating') {
    narration.pause(); music.pause(); cancelAnimationFrame(raf); setPhase('paused', '准备好了再继续');
  } else if (phase === 'paused') {
    const run = generation;
    try {
      await narration.play();
      if (run !== generation) return;
      if ($('music-toggle').checked) {music.volume = Number($('music-volume').value); music.play().catch(() => {});}
      setPhase('narrating', '正在听诗'); paint();
    } catch {setPhase('idle', '点听一听再试一次');}
  } else start();
};
narration.onloadedmetadata = paint;
narration.ontimeupdate = () => {if (phase === 'narrating') paint();};
narration.onended = () => {if (!narration.ended) return; cancelAnimationFrame(raf); setPhase('explore', '诗句读完了'); activityHint(); paint(); fadeMusic();};
$('music-toggle').onchange = () => {
  cancelAnimationFrame(fadeRaf);
  if (!$('music-toggle').checked) music.pause();
  else if (phase === 'narrating') {music.volume = Number($('music-volume').value); music.play().catch(() => {});}
};
$('music-volume').oninput = () => {cancelAnimationFrame(fadeRaf); music.volume = Number($('music-volume').value);};
$('seek').oninput = () => {narration.currentTime = Number($('seek').value); paint();};
$('seek').onchange = () => {if (!['narrating', 'paused'].includes(phase)) start(Number($('seek').value));};
window.addEventListener('pagehide', () => {stopAudio(); clearTimeout(flightTimer); clearTimeout(hintTimer); clearTimeout(feedbackTimer);});

function verseNode(text) {
  const line = document.createElement('div');
  line.className = 'verse';
  let offset = 0, index;
  while ((index = text.indexOf(surname, offset)) !== -1) {
    line.append(document.createTextNode(text.slice(offset, index)));
    const button = document.createElement('button');
    button.className = 'surname-char';
    button.textContent = surname;
    button.setAttribute('aria-label', `找到姓氏${surname}`);
    button.onclick = findSurname;
    line.append(button);
    offset = index + surname.length;
  }
  line.append(document.createTextNode(text.slice(offset)));
  return line;
}

function choosePoem(id) {
  stopAudio();
  poem = poems.find(item => item.id === id);
  if (!poem || poem.lines.length !== 2 || poem.followAlong !== false || !poem.assets.companion || !poem.interaction) throw Error();
  surname = poem.surnames[0];
  if (typeof surname !== 'string' || !surname.trim() || (!isBuildGame() && !Array.isArray(poem.interaction.homeChoices))) throw Error('姓氏互动配置不完整');
  if (poem.interaction.targetSurname !== surname) throw Error('互动姓氏必须与诗句匹配');
  $('choose-wang').setAttribute('aria-pressed', String(surname === '王'));
  $('choose-li').setAttribute('aria-pressed', String(surname === '李'));
  scene.dataset.motif = poem.interaction.motif || 'swallow';
  scene.setAttribute('aria-label', `${poem.title}诗词画面`);
  document.title = `小小诗词园 · 我姓${surname}`;
  $('title').textContent = poem.title;
  $('author').textContent = `${poem.dynasty} · ${poem.author}`;
  $('background').src = poem.assets.background;
  $('background').alt = surname === '李' ? '柔和水墨橘园' : '小燕子、石桥和夕阳下的人家';
  $('companion').src = poem.assets.companion;
  $('companion').alt = `柔和水墨风的${companionLabel()}`;
  narration.src = poem.assets.narration;
  music.src = poem.assets.music;
  $('verses').replaceChildren(...poem.lines.map(verseNode));
  reset();
}
$('choose-wang').onclick = () => choosePoem('wang-wuyixiang');
$('choose-li').onclick = () => choosePoem('li-ganyu-jiangnan');
fetch('materials.json').then(response => {if (!response.ok) throw Error(); return response.json();}).then(data => {
  poems = data.poems;
  const requested = new URLSearchParams(location.search).get('surname');
  choosePoem(requested === '李' || requested === 'li' ? 'li-ganyu-jiangnan' : 'wang-wuyixiang');
}).catch(() => {setPhase('error', '素材还没准备好，请老师帮忙'); $('play').disabled = true;});

function placePart(piece, slot) {
  if (!found || !isBuildGame() || atHome) return;
  piece.style.transform='';
  if (!slot || slot.dataset.part!==piece.dataset.part) {
    piece.classList.add('retry');
    setTimeout(()=>piece.classList.remove('retry'),450);
    activityHint('木在上，子在下'); return;
  }
  placedParts.add(piece.dataset.part);piece.hidden=true;slot.dataset.filled='true';
  if (placedParts.size===2) {
    atHome=true;scene.dataset.home='true';scene.dataset.assembled='true';
    $('character-target').classList.add('complete');
    bird.setAttribute('aria-label', '李字拼好了，小橘子成熟啦');
    sparkle(79,55);activityHint('木和子拼成李，橘子成熟啦');
  }
}
function partSlotAt(event) {
  return [...document.querySelectorAll('.part-slot')].find(slot=>{const r=slot.getBoundingClientRect();return event.clientX>=r.left-12&&event.clientX<=r.right+12&&event.clientY>=r.top-12&&event.clientY<=r.bottom+12;});
}
document.querySelectorAll('.character-part').forEach(piece=>{
  piece.onclick=()=>{if(Date.now()<partClickUntil)return;placePart(piece,document.querySelector(`.part-slot[data-part="${piece.dataset.part}"]`));};
  piece.onpointerdown=event=>{if(!found||atHome)return;partDrag={piece,id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};piece.setPointerCapture(event.pointerId);};
  piece.onpointermove=event=>{if(!partDrag||partDrag.piece!==piece||partDrag.id!==event.pointerId)return;const dx=event.clientX-partDrag.x,dy=event.clientY-partDrag.y;if(Math.hypot(dx,dy)>8)partDrag.moved=true;if(!partDrag.moved)return;piece.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;const target=partSlotAt(event);document.querySelectorAll('.part-slot').forEach(slot=>slot.classList.toggle('ready',slot===target));};
  piece.onpointerup=event=>{if(!partDrag||partDrag.piece!==piece)return;const moved=partDrag.moved;partDrag=null;partClickUntil=Date.now()+350;document.querySelectorAll('.part-slot').forEach(slot=>slot.classList.remove('ready'));placePart(piece,moved?partSlotAt(event):document.querySelector(`.part-slot[data-part="${piece.dataset.part}"]`));};
  piece.onpointercancel=()=>{partDrag=null;piece.style.transform='';document.querySelectorAll('.part-slot').forEach(slot=>slot.classList.remove('ready'));};
});
