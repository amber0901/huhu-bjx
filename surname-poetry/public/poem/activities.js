import {createHoldProgress,surfaceValue,shuffleChoices as shuffled} from './activity-state.js';
import {createActivitySound} from './activity-feedback.js';
import {storySvg} from './story-art.js';
import {createStoryScene} from './story-scenes.js';
// Scene-native touch activities. All timers and pointer sessions belong to one turn.
export const activityIds=['book-flip','footprint-path','cloud-unfold','moon-reflection','fishing-timing','flower-color','weather-hold','horse-flowers','cloud-steps','outside-wall','lantern-route','slow-walk','portrait-parts','pottery-shape','gate-pass','drum-rhythm','bridge-mirror','friend-exchange','tower-stack','friendship-depth','return-trail','wave-sweep','harvest-sort'];
const drawings={
 book:'<path d="M50 25Q25 12 8 23V77Q29 66 50 81Q73 66 92 77V23Q71 12 50 25Z" fill="#ffedc2"/><path d="M50 25V81M18 36L39 37M18 48L39 49M61 37L82 36M61 49L82 48"/>',
 foot:'<ellipse cx="48" cy="56" rx="17" ry="25" fill="#d6af7b" transform="rotate(-20 48 56)"/><circle cx="41" cy="22" r="8" fill="#d6af7b"/><circle cx="57" cy="25" r="6" fill="#d6af7b"/>',
 cloud:'<path d="M21 73C-4 68 5 40 25 43C24 15 64 11 73 41C96 36 107 70 81 74Z" fill="#e5eaf0"/>',
 moon:'<circle cx="50" cy="50" r="33" fill="#ffe3a1"/><circle cx="37" cy="39" r="6" fill="#edcf8b" stroke="none"/><circle cx="59" cy="61" r="9" fill="#f3d893" stroke="none"/>',
 fish:'<path d="M73 51L94 33V71L73 57C48 90 8 69 8 50S48 13 73 46Z" fill="#edb887"/><circle cx="27" cy="45" r="3" fill="#496b65"/>',
 flower:'<path d="M50 75V95M50 88Q22 72 22 88Q35 103 50 91"/><g fill="currentColor"><ellipse cx="50" cy="29" rx="14" ry="24"/><ellipse cx="70" cy="46" rx="24" ry="14" transform="rotate(-20 70 46)"/><ellipse cx="63" cy="66" rx="14" ry="23" transform="rotate(-28 63 66)"/><ellipse cx="35" cy="65" rx="14" ry="23" transform="rotate(28 35 65)"/><ellipse cx="29" cy="44" rx="24" ry="14" transform="rotate(20 29 44)"/></g><circle cx="50" cy="49" r="13" fill="#f4d17f"/>',
 horse:'<path d="M31 87L65 25Q54 2 36 22L22 21L13 43L38 50L20 85M56 21L63 7L69 29" fill="#dec29b"/><circle cx="38" cy="30" r="3" fill="#45655a"/>',
 hill:'<path d="M5 83L36 24L55 56L73 13L97 83Z" fill="#92b7a1"/><path d="M28 39L36 24L45 40M65 31L73 13L81 31" fill="#e7e8d3"/>',
 lantern:'<path d="M36 10H64M50 10V19M31 24Q11 52 31 80H69Q88 52 69 24Z" fill="#efc686"/><path d="M34 22H66M34 81H66M50 82V95M43 24V78M57 24V78"/>',
 boat:'<path d="M7 65H95L80 86H23Z" fill="#d0ad7e"/><path d="M33 64V42Q53 9 73 42V64Z" fill="#f4dcab"/>',
 heart:'<path d="M50 84C-25 35 13 2 50 28C87 2 125 35 50 84Z" fill="#eab1a4"/>',
 cup:'<path d="M19 28H79L71 79H29Z" fill="#f7f1dc"/><ellipse cx="49" cy="28" rx="30" ry="9" fill="#e7eedb"/><path d="M79 40Q105 35 95 62Q90 70 74 66" fill="none"/>',
 ox:'<path d="M26 34Q50 18 74 34V72Q50 92 26 72Z" fill="#c7b99c"/><path d="M28 35Q7 30 13 13M72 35Q93 30 87 13"/><circle cx="37" cy="49" r="3" fill="#536f61"/><circle cx="63" cy="49" r="3" fill="#536f61"/><ellipse cx="50" cy="68" rx="17" ry="10" fill="#e7d4b3"/>',
 drum:'<ellipse cx="50" cy="67" rx="35" ry="20" fill="#c48d6c"/><path d="M15 36V67M85 36V67"/><ellipse cx="50" cy="36" rx="35" ry="21" fill="#f6dfad"/><circle cx="50" cy="36" r="10" fill="#edb587"/>',
 bridge:'<path d="M5 75V60Q50-8 95 60V75H77Q50 20 23 75Z" fill="#c9b9a0"/><path d="M15 53V32M31 33V15M50 24V7M69 33V15M85 53V32"/>',
 scroll:'<path d="M21 24H80V81H21Z" fill="#f5dfb4"/><path d="M17 18H84V28H17ZM17 77H84V87H17Z" fill="#b19b7a"/><path d="M35 40H64M35 51H64M35 62H55"/>',
 tower:'<path d="M17 84V47H83V84ZM26 42V20H74V42Z" fill="#ecd7b2"/><path d="M4 49L17 33H83L96 49ZM14 23L28 7H72L86 23Z" fill="#82a99d"/><path d="M43 84V64Q50 53 57 64V84" fill="#f9efd4"/>',
 wave:'<path d="M4 63Q24 86 40 49Q55 15 79 45Q65 39 66 59Q82 87 96 63" fill="#aacfd3"/><path d="M9 82Q28 91 46 82T88 82"/>',
 plum:'<circle cx="50" cy="58" r="30" fill="#b6cc87"/><path d="M50 28Q46 8 67 9Q78 29 50 28Z" fill="#89aa75"/><path d="M49 29L46 16"/>',
 nut:'<path d="M16 61Q20 18 50 12Q80 18 84 61Q80 89 50 89Q20 89 16 61Z" fill="#b48961"/><path d="M16 67Q50 91 84 67L79 82Q50 103 21 82Z" fill="#ecd5a6"/>',
 leaf:'<path d="M12 77Q9 7 86 14Q92 82 12 77Z" fill="#b1c58f"/><path d="M13 77L68 31"/>',
 eyebrow:'<path d="M14 62Q46 18 86 55Q50 39 14 62Z" fill="#8b7561"/>',
 beard:'<path d="M15 28Q25 65 50 81Q75 65 85 28Q80 91 50 98Q20 91 15 28Z" fill="#9b8870"/>',
};

const svg=(kind)=>storySvg(kind)||`<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="#6a8774" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${drawings[kind]||drawings.leaf}</svg>`;
export function createSceneActivity({element,poem,onComplete}){
 const sound=createActivitySound();
 const game=poem.interaction.game,timers=new Set(),cleanups=[],pauses=[];let alive=true,done=false,started=false,step=0,previewing=false,coach;
 element.replaceChildren();element.dataset.game=game;
 const board=document.createElement('div');board.className='activity-board';board.setAttribute('role','group');board.setAttribute('aria-label',poem.interaction.description);element.append(board);
 const meter=document.createElement('div');meter.className='activity-progress';meter.setAttribute('aria-hidden','true');meter.innerHTML='<i></i><i></i><i></i>';element.append(meter);
 const later=(fn,ms)=>{let id=setTimeout(()=>{timers.delete(id);if(alive)fn();},ms);timers.add(id);return id;};
 const paintProgress=(value)=>{board.style.setProperty('--progress',Math.max(0,Math.min(1,value)));[...meter.children].forEach((el,i)=>el.classList.toggle('filled',value>=(i+1)/3));board.querySelectorAll('.wave-layer').forEach((el,i)=>el.classList.toggle('raised',value*3>i+.5));};
 const win=()=>{if(done||!alive)return;board.querySelectorAll('.gesture-cue,.gesture-path').forEach(e=>e.remove());done=true;clearTimeout(coach);paintProgress(1);board.classList.add('complete');board.dataset.complete='true';onComplete();};
 const fail=(node=board)=>{node.classList.add('try-again');later(()=>node.classList.remove('try-again'),450);};
 const button=(kind,label,fn,parent=board)=>{const b=document.createElement('button');b.className='game-piece';b.setAttribute('aria-label',label);b.innerHTML=svg(kind);b.onclick=()=>{if(started&&(!done||b.dataset.freeplay==='true')&&!previewing)fn?.(b);};parent.append(b);return b;};
 const pulse=(b,ms=1100)=>{if(!b)return;b.classList.add('lit');later(()=>b.classList.remove('lit'),ms);};
 function demo(motion='tap',target=board,endTarget){
  if(!target||done)return;board.querySelectorAll('.gesture-cue,.gesture-path').forEach(e=>e.remove());
  const cue=document.createElement('span');cue.className='gesture-cue';cue.dataset.motion=motion;cue.setAttribute('aria-hidden','true');cue.innerHTML='<svg viewBox="0 0 32 32"><use href="/icons.svg#touch"></use></svg>';
  const a=board.getBoundingClientRect(),b=target.getBoundingClientRect();cue.style.setProperty('--orbit-x',a.width*.34+'px');cue.style.setProperty('--orbit-y',a.height*.33+'px');cue.style.left=((b.x+b.width/2-a.x)/a.width*100)+'%';cue.style.top=((b.y+b.height/2-a.y)/a.height*100)+'%';
  if(endTarget){const t=endTarget.getBoundingClientRect();cue.style.setProperty('--guide-x',(t.x+t.width/2-b.x-b.width/2)+'px');cue.style.setProperty('--guide-y',(t.y+t.height/2-b.y-b.height/2)+'px');}
  board.append(cue);later(()=>cue.remove(),3300);
 }
 let hint=()=>{const next=board.querySelector('button:not([disabled]):not(.collected),input');if(next){pulse(next);demo('tap',next);}else demo('horizontal');},start;
 function coachAgain(){clearTimeout(coach);timers.delete(coach);if(done||!alive)return;coach=later(()=>{if(!element.hidden&&!previewing)hint();coachAgain();},7000);}
 board.addEventListener('pointerdown',()=>{board.querySelector('.gesture-cue')?.remove();coachAgain();},{capture:true});
 board.addEventListener('keydown',coachAgain);
 function slider(label,{initial=0,target=100,onvalue,vertical=false,surface,range=[0,100],relative=false,stretch=false,travel=50}={}){
  const input=document.createElement('input');input.type='range';input.min=0;input.max=100;input.step=1;input.value=initial;input.setAttribute('aria-label',label);input.className='game-slider';if(vertical)input.classList.add('vertical');
  function update(v){if(!started||done||previewing)return;input.value=Math.round(Math.max(0,Math.min(100,v)));onvalue?.(+input.value,input);if(Math.abs(+input.value-target)<=5){input.value=target;onvalue?.(target,input);win();}}
  input.oninput=()=>update(+input.value);board.append(input);
  if(surface){
   input.classList.add('direct-range');let pointer,origin,dragged=false;
   const move=e=>{if(pointer!==e.pointerId||done)return;if(!dragged&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)<6)return;dragged=true;const box=surface.getBoundingClientRect();const percent=vertical?(e.clientY-box.y)/box.height*100:(e.clientX-box.x)/box.width*100;const delta=(vertical?e.clientY-origin.y:e.clientX-origin.x)/(vertical?box.height:box.width)*100;update(surfaceValue({position:percent,delta,initial:origin.value,range,relative,stretch,travel}));};
   surface.onpointerdown=e=>{if(!started||done||pointer!==undefined||e.target.closest('button,input'))return;pointer=e.pointerId;origin={x:e.clientX,y:e.clientY,value:+input.value};dragged=false;surface.setPointerCapture(pointer);};surface.onpointermove=move;surface.onpointerup=e=>{move(e);pointer=undefined;};surface.onpointercancel=surface.onlostpointercapture=()=>pointer=undefined;pauses.push(()=>pointer=undefined);
  }
  hint=()=>demo(vertical?'vertical':'horizontal',surface||input);start=hint;return input;
 }
 function ordered(kinds,positions,{memory=false,order=kinds.map((_,i)=>i)}={}){
  board.classList.add('spatial-board');
  const pieces=kinds.map((kind,index)=>{const b=button(kind,`${poem.surnames[0]}：第${index+1}处${kind==='foot'?'脚印':'图案'}`,()=>{
   if(index!==order[step])return fail(b);b.classList.add('collected');step++;paintProgress(step/order.length);if(step===order.length)win();else if(!memory)pulse(pieces[order[step]]);
  });b.style.left=positions[index][0]+'%';b.style.top=positions[index][1]+'%';return b;});
  hint=()=>{if(done||previewing)return;if(memory){previewing=true;board.setAttribute('aria-busy','true');pieces.forEach(b=>b.disabled=true);order.slice(step).forEach((n,i)=>later(()=>pulse(pieces[n],550),i*1000));later(()=>{previewing=false;board.setAttribute('aria-busy','false');pieces.forEach(b=>b.disabled=false);},(order.length-step)*1000+150);}else{pulse(pieces[order[step]]);demo('tap',pieces[order[step]]);}};start=hint;
 }
 function holdControl(kind,label,seconds,onProgress){
  const b=button(kind,label);b.classList.add('hold-piece');let pointer;
  const controller=createHoldProgress({duration:seconds*1000,onProgress:v=>{paintProgress(v);onProgress?.(v);},onFull:()=>{b.classList.remove('holding');board.classList.remove('pressing');win();}});
  function down(event){if(!started||done||pointer!==undefined)return;if(event.pointerId!==undefined){pointer=event.pointerId;b.setPointerCapture(pointer);}b.classList.add('holding');board.classList.add('pressing');controller.start();}
  function stop(){controller.stop();pointer=undefined;b.classList.remove('holding');board.classList.remove('pressing');}
  b.onpointerdown=down;b.onpointerup=e=>{if(e.pointerId===pointer)stop();};b.onpointercancel=stop;b.onlostpointercapture=stop;
  b.onkeydown=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)down(e);}};b.onkeyup=e=>{if([' ','Enter'].includes(e.key))stop();};b.onblur=stop;b.onclick=()=>{};cleanups.push(()=>controller.destroy());pauses.push(stop);hint=()=>{pulse(b);demo('hold',b);};start=hint;return b;
 }
 const story=createStoryScene(game,{board,button,svg,pulse,demo,later,win,paintProgress,slider,holdControl,pauses,shuffle:shuffled,active:()=>started&&!done&&!previewing});
 if(story){hint=story.hint;start=story.start||hint;}
 else if(game==='book-flip'){
  const strokes=['M49 12L54 23','M20 33H80','M65 34Q60 67 22 88','M33 39Q47 72 82 88'];
  const book=button('book','翻开下一页',b=>{step++;b.classList.remove('page-turn');void b.offsetWidth;b.classList.add('page-turn');paintProgress(step/4);book.querySelectorAll('.book-writing path').forEach((path,i)=>path.classList.toggle('inked',i<step));if(step===4)win();});book.classList.add('large-piece');
  const chars=document.createElement('span');chars.className='book-writing';chars.setAttribute('aria-hidden','true');chars.innerHTML='<svg viewBox="0 0 100 100" fill="none" stroke-linecap="round">'+strokes.map(d=>`<path d="${d}"/>`).join('')+'</svg>';book.append(chars);book.insertAdjacentHTML('beforeend','<span class="book-page-corner" aria-hidden="true"></span>');
  let pagePointer,pageX,moved=false,suppressPageClick=0;const turn=book.onclick;book.onclick=()=>{if(Date.now()>=suppressPageClick)turn();};
  book.onpointerdown=e=>{if(!started||done)return;pagePointer=e.pointerId;pageX=e.clientX;moved=false;book.setPointerCapture(pagePointer);};book.onpointermove=e=>{if(e.pointerId===pagePointer&&Math.abs(e.clientX-pageX)>24)moved=true;};book.onpointerup=e=>{if(e.pointerId!==pagePointer)return;pagePointer=undefined;if(moved){turn();suppressPageClick=Date.now()+400;}};book.onpointercancel=book.onlostpointercapture=()=>pagePointer=undefined;
  hint=()=>{pulse(book);demo('horizontal',book);};
 }else if(game==='footprint-path')ordered(['foot','foot','foot','heart'],[[12,72],[39,57],[63,36],[84,14]]);
 else if(game==='cloud-unfold'){
  const scene=document.createElement('div');scene.className='cloud-curtain';scene.innerHTML=svg('hill')+'<span>'+svg('cloud')+'</span><span>'+svg('cloud')+'</span>';board.append(scene);
  slider('向两侧展开云锦画屏',{surface:scene,onvalue:v=>{paintProgress(v/100);scene.style.setProperty('--open',v/100);}});
 }else if(game==='moon-reflection'){
  const pond=document.createElement('div');pond.className='moon-pond';pond.innerHTML='<span class="moon-outline">'+svg('moon')+'</span><span class="moon-moving">'+svg('moon')+'</span>';board.append(pond);const target=65;
  slider('移动江中月影，与轮廓重合',{initial:12,target,surface:pond,onvalue:v=>{pond.style.setProperty('--moon',v+'%');paintProgress(1-Math.abs(v-target)/65);}});pond.style.setProperty('--moon','12%');
 }else if(game==='fishing-timing'){
  board.classList.add('fishing-board');const pond=document.createElement('div');pond.className='float-pond';pond.innerHTML='<span class="float-target"></span><span class="float-bob"></span>';board.append(pond);
  let phase=0;const fish=button('fish','鱼漂进入绿色圆环时提竿',b=>{if(Math.abs(Math.sin(phase))<.48){b.classList.add('caught');win();}else fail(b);});
  function animate(){if(!alive||done||!started)return;phase+=.045;pond.style.setProperty('--float',50+32*Math.sin(phase)+'%');pond.classList.toggle('ready',Math.abs(Math.sin(phase))<.48);later(animate,40);}hint=()=>{pulse(fish);demo('tap',fish);};start=()=>{phase=0;animate();demo('tap',fish);};
 }else if(game==='flower-color'){
  board.classList.add('wildflower-board');board.insertAdjacentHTML('afterbegin','<span class="paint-bridge" aria-hidden="true">'+svg('bridge')+'</span>');
  let selected;const palette=document.createElement('div');palette.className='game-palette';board.append(palette);
  ['#ba5b49','#7ba7b5','#d5b867'].forEach((color,i)=>{const b=button('paint',['朱红色颜料','蓝色颜料','黄色颜料'][i],()=>{selected=i;palette.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));if(!done)hint();},palette);b.style.color=color;b.dataset.freeplay='true';});
  const flowers=document.createElement('div');flowers.className='game-row';board.append(flowers);
  for(let i=0;i<3;i++){const b=button('flower',`给第${i+1}朵小花涂朱红`,b=>{if(selected===undefined)return hint();if(done){b.style.color=['#ba5b49','#7ba7b5','#d5b867'][selected];return;}if(selected!==0)return hint();if(b.classList.contains('collected'))return;b.classList.add('collected');b.style.color='#ba5b49';step++;paintProgress(step/3);if(step===3)win();else hint();},flowers);b.dataset.freeplay='true';}
  hint=()=>{const b=selected===0?flowers.querySelector('button:not(.collected)'):palette.firstElementChild;pulse(b);demo('tap',b);};
 }else if(game==='weather-hold'){
  board.classList.add('weather-board');
  const rain=document.createElement('span');rain.className='scene-rain';rain.setAttribute('aria-hidden','true');rain.innerHTML='<i></i><i></i><i></i><i></i>';board.append(rain);
  const lotus=document.createElement('div');lotus.className='lotus-bloom';lotus.innerHTML=svg('lotus');board.append(lotus);holdControl('cloud','按住小云朵，让细雨浇开荷花',1.8,v=>{lotus.style.transform=`scale(${.5+v*.5})`;lotus.style.opacity=.4+v*.6;});
 }else if(game==='horse-flowers'){
  board.classList.add('horse-garden');
  const points=[[27,28],[75,25],[60,74]],visited=new Set();let pointer,travelling=false;
  const horse=button('horse','拖动小马去看花，也可以点花让小马走过去');horse.classList.add('garden-horse');
  const picture=document.createElement('img');picture.src=poem.assets.companion;picture.alt='';picture.draggable=false;horse.replaceChildren(picture);
  const place=(x,y)=>{horse.style.left=x+'%';horse.style.top=y+'%';};place(23,69);
  function bloom(i){if(done||visited.has(i))return;visited.add(i);flowers[i].classList.add('bloomed');flowers[i].setAttribute('aria-pressed','true');step=visited.size;paintProgress(step/3);if(step===3)win();}
  const flowers=points.map(([x,y],i)=>{const b=button('flower',`带小马去看第${i+1}处花`,()=>{if(travelling||pointer!==undefined||(!done&&visited.has(i)))return;travelling=true;horse.classList.add('trotting');place(x,y);later(()=>{horse.classList.remove('trotting');travelling=false;bloom(i);},550);});b.classList.add('garden-flower');b.innerHTML='<span class="garden-bud">'+svg('bud')+'</span><span class="garden-petals">'+svg('flower')+'</span>';b.style.left=x+'%';b.style.top=y+'%';b.style.color=['#e4a0a0','#e8c472','#b6a2cb'][i];b.dataset.freeplay='true';b.setAttribute('aria-pressed','false');return b;});
  horse.onclick=()=>{};
  horse.onpointerdown=e=>{if(!started||travelling||pointer!==undefined)return;e.preventDefault();pointer=e.pointerId;horse.classList.add('dragging');horse.setPointerCapture(pointer);};
  horse.onpointermove=e=>{if(pointer!==e.pointerId)return;const r=board.getBoundingClientRect(),x=Math.max(22,Math.min(78,(e.clientX-r.x)/r.width*100)),y=Math.max(23,Math.min(77,(e.clientY-r.y)/r.height*100));place(x,y);points.forEach(([a,b],i)=>{if(Math.hypot(x-a,y-b)<17)bloom(i);});};
  function stop(e){if(e.pointerId!==pointer)return;pointer=undefined;horse.classList.remove('dragging');}
  horse.onpointerup=horse.onpointercancel=horse.onlostpointercapture=stop;
  hint=()=>{const target=flowers.find((_,i)=>!visited.has(i));pulse(target);demo('drag',horse,target);};start=hint;
 }else if(game==='cloud-steps')ordered(['cloud','cloud','cloud','moon'],[[13,84],[37,62],[62,39],[85,15]]);
 else if(game==='outside-wall'){
  board.classList.add('wall-board');board.insertAdjacentHTML('beforeend','<div class="wall-outline">'+svg('tower')+'</div>');
  [[17,15,true],[51,62,false],[85,20,true]].forEach(([x,y,correct],i)=>{const b=button('hill',`第${i+1}座山，${correct?'城郭外':'城郭内'}`,()=>{if(!correct)return fail(b);if(b.classList.contains('collected'))return;b.classList.add('collected');step++;paintProgress(step/2);if(step===2)win();});b.style.left=x+'%';b.style.top=y+'%';});hint=()=>board.querySelectorAll('button').forEach(b=>{if(b.getAttribute('aria-label').endsWith('城郭外'))pulse(b);});
 }else if(game==='lantern-route'){
  board.classList.add('lantern-board');let found=false;const boat=button('boat','照亮后送小船出发',b=>{if(!found)return fail(b);b.classList.add('departing');win();});boat.style.left='73%';
  const lamp=document.createElement('span');lamp.className='moving-lantern';lamp.innerHTML=svg('lantern');board.append(lamp);
  slider('移动小灯寻找江上的小船',{initial:10,target:-100,surface:board,onvalue:v=>{lamp.style.left=v+'%';found=Math.abs(v-73)<17;boat.classList.toggle('illuminated',found);paintProgress(found?.66:.2);}});hint=()=>{demo('horizontal',board);pulse(boat);};
 }else if(game==='slow-walk'){
  board.classList.add('walking-board');const person=document.createElement('span');person.className='walking-foot';person.innerHTML=svg('foot');board.append(person);holdControl('leaf','按住树叶，陪诗人徐徐前行；松开就停',3,v=>person.style.left=(12+v*76)+'%');
 }else if(game==='portrait-parts'){
  const face=document.createElement('div');face.className='portrait-face';face.innerHTML='<svg class="portrait-lines" viewBox="0 0 100 120" aria-hidden="true"><ellipse cx="31" cy="46" rx="4" ry="5" fill="#647669"/><ellipse cx="69" cy="46" rx="4" ry="5" fill="#647669"/><circle cx="23" cy="62" r="8" fill="#e7b5a1" opacity=".65"/><circle cx="77" cy="62" r="8" fill="#e7b5a1" opacity=".65"/><path d="M48 54q-5 13 5 11M38 77q12 11 24 0" fill="none" stroke="#a27f67" stroke-width="2.5" stroke-linecap="round"/></svg>'; board.append(face);let stage=0;
  const choices=document.createElement('div');choices.className='game-row';board.append(choices);
  let correctChoice;
  function draw(){choices.replaceChildren();shuffled([-30,0,35],stage===0?'portrait-eyebrow':'portrait-beard',0).forEach((angle,i)=>{const kind=stage===0?'eyebrow':'beard',b=button(kind,`${stage===0?'弯眉':'卷须'}图案${i+1}`,()=>{if(angle!==0)return fail(b);face.insertAdjacentHTML('beforeend',`<span class="portrait-${kind}">${svg(kind)}${kind==='eyebrow'?svg(kind):''}</span>`);stage++;paintProgress(stage/2);if(stage===2)win();else draw();},choices);b.style.transform=`rotate(${angle}deg)`;if(angle===0)correctChoice=b;});}draw();
  const model=document.createElement('div');model.className='portrait-model';model.innerHTML=svg('eyebrow')+svg('beard');board.prepend(model);hint=()=>{pulse(correctChoice);demo('tap',correctChoice);};start=()=>demo('tap',choices);
 }else if(game==='pottery-shape'){
  board.classList.add('pottery-board');const wheel=document.createElement('div');wheel.className='pottery-wheel';wheel.innerHTML='<div class="pottery-outline">'+svg('cup')+'</div><div class="pottery-shaping">'+svg('cup')+'</div>';board.append(wheel);
  slider('左右拉开陶土，做圆瓷碗',{surface:wheel,onvalue:v=>{paintProgress(v/100);wheel.style.setProperty('--shape',.45+v*.0055);}});
 }else if(game==='gate-pass'){
  let rotation=2;const halves=document.createElement('div');halves.className='ox-halves';halves.innerHTML='<span>'+svg('ox')+'</span><span>'+svg('ox')+'</span>';board.append(halves);const movable=halves.lastChild;movable.style.transform='rotate(180deg)';
  const turn=button('ox','转动右半青牛图案，让两半相合',()=>{rotation=(rotation+1)%4;movable.style.transform=`rotate(${rotation*90}deg)`;paintProgress(rotation===0?1:.3);if(rotation===0){board.classList.add('pass-open');win();}});hint=()=>pulse(turn);
 }else if(game==='drum-rhythm'){
  board.classList.add('celebration-drum');board.insertAdjacentHTML('afterbegin','<div class="celebration-ribbons" aria-hidden="true"><i></i><i></i><i></i></div>');
  let lastTap=-Infinity;const drum=button('drum','敲鼓庆贺，让三条彩带飘起来',b=>{const now=performance.now();if(now-lastTap<160)return;lastTap=now;sound.play('drum');pulse(b,220);if(done)return;step++;board.querySelectorAll('.celebration-ribbons i').forEach((r,i)=>r.classList.toggle('unfurled',i<step));paintProgress(step/3);if(step===3)win();});drum.classList.add('large-piece');drum.dataset.freeplay='true';
  hint=()=>{pulse(drum);demo('tap',drum);};start=hint;
 }else if(game==='bridge-mirror'){
  const model=document.createElement('div');model.className='bridge-model';model.innerHTML=svg('bridge');board.append(model);const choices=document.createElement('div');choices.className='game-row';board.append(choices);
  let correctMirror;
  shuffled(['rotate(90deg)','scaleY(-1)','rotate(-90deg)'],'bridge-mirror','scaleY(-1)').forEach((transform,i)=>{const b=button('bridge',`选择第${i+1}个石桥倒影`,()=>{if(transform!=='scaleY(-1)')return fail(b);b.classList.add('selected');win();},choices);b.querySelector('svg').style.transform=transform;if(transform==='scaleY(-1)')correctMirror=b;});hint=()=>{pulse(correctMirror);demo('tap',correctMirror);};start=()=>demo('tap',choices);
 }else if(game==='friend-exchange'){
  const row=document.createElement('div');row.className='friend-exchange';board.append(row);const a=button('scroll','把书卷送给廖子',b=>{if(step!==0)return fail(b);b.classList.add('delivered');step=1;paintProgress(.5);pulse(c);},row);const c=button('flower','把花枝回赠朋友',b=>{if(step!==1)return fail(b);b.classList.add('returned');win();},row);hint=()=>pulse(step===0?a:c);
 }else if(game==='tower-stack'){
  const stack=document.createElement('div');stack.className='tower-stack';board.append(stack);const row=document.createElement('div');row.className='game-row';board.append(row);
  shuffled([0,1,2],'tower-stack',0).forEach(size=>{const b=button('tower',`第${size+1}层楼，${['宽','中','窄'][size]}`,()=>{if(size!==step)return fail(b);b.disabled=true;const part=document.createElement('span');part.innerHTML=svg('tower');part.style.width=(100-size*22)+'%';stack.prepend(part);step++;paintProgress(step/3);if(step===3)win();},row);b.querySelector('svg').style.width=(90-size*20)+'%';b.dataset.size=size;});hint=()=>pulse(row.querySelector(`[data-size="${step}"]`));
 }else if(game==='friendship-depth'){
  board.classList.add('depth-board');const depth=document.createElement('div');depth.className='friendship-well';depth.innerHTML=svg('wave')+'<span class="depth-rope"><i></i></span><span class="depth-heart">'+svg('heart')+'</span>';board.append(depth);
  slider('向下拉探水绳，发现汪伦的送别情谊',{vertical:true,surface:depth,onvalue:v=>{paintProgress(v/100);depth.style.setProperty('--depth',v/100);}});
 }else if(game==='return-trail')ordered(['leaf','flower','scroll'],[[15,72],[50,20],[85,72]],{memory:true,order:[0,2,1]});
 else if(game==='wave-sweep'){
  board.classList.add('wave-board');board.innerHTML=[0,1,2].map(i=>svg('wave').replace('<svg ',`<svg class="wave-layer" style="--wave-index:${i}" `)).join('');board.tabIndex=0;board.setAttribute('aria-label','在水面左右来回划动，推起三层洪波');let pointer,lastX,dir=0,travel=0,turns=0,lastCounted=0;
  function gust(){if(done)return;turns++;paintProgress(turns/3);if(turns===3)win();}
  const leaf=button('leaf','点秋叶吹起一阵风，也可在海面左右划动',gust);leaf.classList.add('wind-leaf');
  const move=e=>{if(pointer!==e.pointerId||done||!started)return;const dx=e.clientX-lastX;lastX=e.clientX;if(Math.abs(dx)<2)return;const next=Math.sign(dx);if(next!==dir){dir=next;travel=0;}travel+=Math.abs(dx);board.style.setProperty('--sweep',Math.max(-18,Math.min(18,dx))+'px');if(travel>board.clientWidth*.2){travel=0;gust();}};
  hint=()=>demo('horizontal',board);start=hint;
  board.onpointerdown=e=>{if(done||pointer!==undefined||e.target.closest('button'))return;pointer=e.pointerId;lastX=e.clientX;dir=0;travel=0;board.setPointerCapture(e.pointerId);};board.onpointermove=move;board.onpointerup=board.onpointercancel=board.onlostpointercapture=()=>pointer=undefined;
  board.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=e.key==='ArrowLeft'?-1:1;if(next!==dir){dir=next;turns++;paintProgress(turns/3);if(turns===3)win();}}};
 }else if(game==='harvest-sort'){
  board.classList.add('harvest-board');const basket=document.createElement('div');basket.className='fruit-basket';board.append(basket);
  ['nut','leaf','nut','nut'].forEach((kind,i)=>{const b=button(kind,kind==='nut'?`收第${i+1}颗栗果`:'叶子留在树上',()=>{if(kind==='leaf')return fail(b);if(b.disabled)return;b.disabled=true;b.classList.add('collected');basket.insertAdjacentHTML('beforeend',svg('nut'));step++;paintProgress(step/3);if(step===3)win();});});
 }else throw Error('未知诗词互动：'+game);
 return{start(){const first=!started;started=true;if(first)(start||hint)();else if(!done)hint();coachAgain();},pause(){clearTimeout(coach);pauses.forEach(fn=>fn());},hint(){if(started&&!done)hint();},destroy(){alive=false;for(const id of timers)clearTimeout(id);cleanups.forEach(fn=>fn());sound.destroy();element.replaceChildren();}};
}
