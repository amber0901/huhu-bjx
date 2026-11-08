// Per-poem activities. No spoken feedback; all actions follow surname discovery.
import {activityIds,createSceneActivity} from './activities.js';
export const sceneGames=new Set(['pluck-melody',...activityIds]);
export function createPlayground({element,poem,onComplete}) {
  if(!sceneGames.has(poem.interaction.game))throw Error('尚未实现该诗词互动');
  if(poem.interaction.game!=='pluck-melody')return createSceneActivity({element,poem,onComplete});
  const timers=new Set();let alive=true,done=false,step=0,previewing=false,audio;
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(alive)fn();},ms);timers.add(id);return id;};
  function tone(index){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    audio ||= new Audio();audio.resume().catch(()=>{});
    const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
    oscillator.type='sine';oscillator.frequency.value=[523.25,587.33,659.25][index];
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.5);
    oscillator.connect(gain).connect(audio.destination);oscillator.start(now);oscillator.stop(now+.52);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  element.replaceChildren();
  const board=document.createElement('div');board.className='zheng-board';board.setAttribute('role','group');board.setAttribute('aria-label','跟随亮起的琴弦，依次轻拨');
  const strings=[0,1,2].map(index=>{
    const button=document.createElement('button');button.className='zheng-string';button.dataset.note=String(index);
    button.setAttribute('aria-label',`第${index+1}根琴弦`);
    button.innerHTML='<span class="string-line"></span><span class="string-bead"></span>';
    board.append(button);return button;
  });
  const dots=document.createElement('div');dots.className='melody-progress';dots.setAttribute('aria-hidden','true');
  for(let i=0;i<3;i++)dots.append(document.createElement('i'));
  const order=poem.interaction.notes;
  if(!Array.isArray(order)||order.length!==3||!order.every(n=>Number.isInteger(n)&&n>=0&&n<3))throw Error('琴弦顺序无效');
  function flash(index,withTone=false){strings[index].classList.add('lit');if(withTone)tone(index);later(()=>strings[index].classList.remove('lit'),450);}
  function preview(){
    if(done||previewing)return;previewing=true;board.setAttribute('aria-busy','true');strings.forEach(b=>b.disabled=true);
    order.slice(step).forEach((note,i)=>later(()=>flash(note),i*900+150));later(()=>{previewing=false;board.setAttribute('aria-busy','false');strings.forEach(b=>b.disabled=false);},(order.length-step)*900+200);
  }
  for(const [index,button] of strings.entries())button.onclick=()=>{
    if(done||previewing)return;flash(index,true);
    if(index!==order[step]){board.classList.add('try-again');later(()=>board.classList.remove('try-again'),450);return;}
    dots.children[step].classList.add('filled');step++;
    if(step===order.length){done=true;board.classList.add('complete');onComplete();}
  };
  element.append(board,dots);
  return {start:preview,hint:preview,destroy(){alive=false;for(const timer of timers)clearTimeout(timer);audio?.close().catch(()=>{});element.replaceChildren();}};
}
