// Concrete picture-book tasks. Every prop, destination and outcome is visible.
export function createStoryScene(game,a){
 const {board,button,svg,pulse,demo,later,win,paintProgress,slider,holdControl,active,pauses}=a;
 const supported=['footprint-path','slow-walk','cloud-unfold','moon-reflection','portrait-parts','fishing-timing','gate-pass','friend-exchange','friendship-depth','lantern-route','return-trail','cloud-steps','pottery-shape','tower-stack','harvest-sort','outside-wall','bridge-mirror'];
 if(!supported.includes(game))return null;
 board.classList.add('story-board');board.dataset.story=game;
 const place=(node,x,y,w=25,h=35)=>{Object.assign(node.style,{position:'absolute',left:x+'%',top:y+'%',width:w+'%',height:h+'%',transform:'translate(-50%,-50%)'});return node;};
 const prop=(kind,x,y,w=25,h=35,className='')=>{const node=document.createElement('div');node.className='story-prop '+className;node.innerHTML=svg(kind);board.append(node);return place(node,x,y,w,h);};
 const person=(kind,x,y,w=28,h=54)=>prop(kind,x,y,w,h,'story-person');
 const goal=(kind,x,y,w=25,h=35)=>prop(kind,x,y,w,h,'story-goal');
 function carry(kind,label,from,to,onArrive,{w=23,h=30}={}){
  let pointer,origin,dragged=false,delivered=false,suppress=0;
  const b=button(kind,label,()=>{if(Date.now()>=suppress)deliver();});place(b,...from,w,h);b.classList.add('story-carry');
  function deliver(){if(delivered||!active())return;delivered=true;b.disabled=true;b.classList.remove('dragging');to.classList.add('receiving');const r=board.getBoundingClientRect(),t=to.getBoundingClientRect();place(b,(t.x+t.width/2-r.x)/r.width*100,(t.y+t.height/2-r.y)/r.height*100,w,h);b.classList.add('delivering');later(()=>{b.hidden=true;to.classList.remove('receiving');onArrive();},450);}
  b.onpointerdown=e=>{if(!active()||delivered||pointer!==undefined)return;e.preventDefault();pointer=e.pointerId;origin=[e.clientX,e.clientY];dragged=false;b.setPointerCapture(pointer);};
  b.onpointermove=e=>{if(pointer!==e.pointerId||delivered)return;if(!dragged&&Math.hypot(e.clientX-origin[0],e.clientY-origin[1])<7)return;dragged=true;b.classList.add('dragging');const r=board.getBoundingClientRect();place(b,Math.max(w/2,Math.min(100-w/2,(e.clientX-r.x)/r.width*100)),Math.max(h/2,Math.min(100-h/2,(e.clientY-r.y)/r.height*100)),w,h);};
  b.onpointerup=e=>{if(pointer!==e.pointerId)return;pointer=undefined;b.classList.remove('dragging');if(!dragged)return;suppress=Date.now()+400;const t=to.getBoundingClientRect(),r=board.getBoundingClientRect();if(Math.hypot(e.clientX-t.x-t.width/2,e.clientY-t.y-t.height/2)<Math.max(40,r.width*.2))deliver();else place(b,...from,w,h);};
  const cancel=()=>{pointer=undefined;b.classList.remove('dragging');if(!delivered)place(b,...from,w,h);};b.onpointercancel=cancel;b.onlostpointercapture=()=>{if(pointer!==undefined)cancel();};pauses.push(cancel);
  return {node:b,hint(){if(!delivered){pulse(b);pulse(to);demo('drag',b,to);}}};
 }
 if(game==='footprint-path'){
  const elder=person('elder',13,61),children=person('child',85,58);person('child',74,57,21,43);board.classList.add('greeting-scene');
  let step=0;const points=[[33,73],[51,66],[68,74]];
  const footsteps=points.map(([x,y],i)=>{const b=button('foot',`点第${i+1}个脚印，迎接回乡的客人`,()=>{if(i!==step)return;b.classList.add('collected');elder.style.left=(x-6)+'%';step++;paintProgress(step/3);if(step===3){elder.style.left='66%';children.classList.add('waving');board.classList.add('friends-met');win();}else hint();});place(b,x,y,18,24);return b;});
  const hint=()=>{pulse(footsteps[step]);demo('tap',footsteps[step]);};return{hint};
 }
 if(game==='slow-walk'){
  prop('gate',86,54,24,55);board.classList.add('rainy-trail');
  const walker=holdControl('traveler','按住诗人，陪他慢慢走；松开就停',3,v=>{walker.style.left=(16+v*58)+'%';board.style.setProperty('--walk',v);});place(walker,16,62,30,62);walker.classList.add('walking-person');
  const hint=()=>{pulse(walker);demo('hold',walker);};return{hint};
 }
 if(game==='cloud-unfold'){
  const screen=prop('screen',50,48,92,86,'folding-screen');const clouds=prop('cloud',46,48,82,78,'screen-cloud');
  const grip=prop('cloud',14,76,23,28,'cloud-grip');
  const edge=goal('cloud',87,76,23,28);
  slider('拉着小云朵向右展开山水画屏',{surface:board,range:[14,87],onvalue:v=>{screen.style.setProperty('--unfold',.13+v*.0087);clouds.style.opacity=.35*(1-v/100);grip.style.left=(14+v*.73)+'%';paintProgress(v/100);}});
  const hint=()=>{pulse(grip);demo('drag',grip,edge);};return{hint};
 }
 if(game==='moon-reflection'){
  board.classList.add('river-scene');const poet=person('traveler',77,57,21,43);prop('boat',76,76,42,31);
  const ring=goal('moon',73,38,25,35),moon=prop('moon',18,38,25,35,'near-moon');
  slider('拖江中的月亮，让月影靠近船上的诗人',{initial:18,target:73,surface:board,onvalue:v=>{moon.style.left=v+'%';paintProgress(Math.max(0,1-Math.abs(v-73)/55));if(Math.abs(v-73)<6){poet.classList.add('waving');board.classList.add('moon-close');}}});
  const hint=()=>{pulse(moon);demo('drag',moon,ring);};return{hint};
 }
 if(game==='portrait-parts'){
  board.classList.add('portrait-story');let count=0;
  const face=prop('friend',50,41,53,78,'portrait-body');
  const brow=goal('browpair',50,34,29,19),beard=goal('curlbeard',50,57,25,29);
  const pieces=[carry('browpair','把虎眉贴到陈伯伯的眉毛轮廓',[23,84],brow,()=>finish(brow),{w:31,h:25}),carry('curlbeard','把卷胡子贴到陈伯伯的下巴轮廓',[76,82],beard,()=>finish(beard),{w:26,h:35})];
  function finish(target){target.classList.add('fitted');count++;paintProgress(count/2);face.classList.add('waving');if(count===2)win();else hint();}
  const hint=()=>{const i=brow.classList.contains('fitted')?1:0;pieces[i].hint();};return{hint};
 }
 if(game==='fishing-timing'){
  board.classList.add('fishing-story','river-scene');person('elder',22,32,27,52);prop('boat',25,56,44,29);prop('rod',49,38,48,66);
  const fish=prop('fish',79,79,25,25,'fishing-fish');let stage=0;
  const bob=button('float','点鱼漂下竿，等鱼漂亮起后再点一下提竿',()=>{
   if(stage===0){stage=1;paintProgress(.3);board.classList.add('line-cast');fish.style.left='65%';bob.disabled=true;later(()=>{stage=2;bob.disabled=false;bob.classList.add('bite-ready');paintProgress(.65);hint();},900);}
   else if(stage===2){stage=3;fish.classList.add('fish-lifted');board.classList.add('fish-caught');win();}
  });place(bob,67,57,25,42);bob.classList.add('fishing-bob');
  const hint=()=>{if(stage!==1){pulse(bob);demo('tap',bob);}};return{hint};
 }
 if(game==='gate-pass'){
  board.classList.add('pass-story');const gate=prop('gate',51,42,69,85,'pass-building');person('friend',16,63,24,48);const elder=person('elder',76,63,24,47);prop('boat',87,88,29,17);
  const latch=prop('latch',37,57,40,22,'pass-latch');
  const end=goal('latch',74,57,40,22);
  slider('向右拉开关隘的门闩，送仙翁到河边',{surface:board,range:[37,74],onvalue:v=>{paintProgress(v/100);latch.style.left=(37+v*.37)+'%';gate.style.setProperty('--gate-open',v/100);if(v>94){board.classList.add('gate-open');elder.style.left='86%';elder.style.top='73%';elder.classList.add('waving');}}});
  const hint=()=>{pulse(latch);demo('drag',latch,end);};return{hint};
 }
 if(game==='friend-exchange'){
  board.classList.add('exchange-story');const poet=person('traveler',18,40,31,63),friend=person('friend',82,40,31,63);let first=true,second;
  const friendHand=goal('scroll',70,48,18,24),poetHand=goal('flower',30,51,18,24);poetHand.hidden=true;
  const scroll=carry('scroll','把书卷送到廖朋友手里',[28,76],friendHand,()=>{first=false;friendHand.classList.add('fitted');poetHand.hidden=false;friend.classList.add('waving');paintProgress(.5);second=carry('flower','把朋友回赠的花枝送回来',[73,76],poetHand,()=>{poetHand.classList.add('fitted');poet.classList.add('waving');board.classList.add('friends-met');win();});hint();});
  const hint=()=>first?scroll.hint():second?.hint();return{hint};
 }
 if(game==='friendship-depth'){
  board.classList.add('farewell-story','river-scene');const shore=person('friend',17,46,29,61),poet=person('traveler',51,56,25,51),boat=prop('boat',51,77,37,28);let stage=0;
  const hearts=[0,1,2].map(i=>prop('heart',33+i*20,29+i*8,16,20,'farewell-heart'));hearts.forEach(h=>h.style.opacity=0);
  const wave=holdControl('friend','按住岸边的朋友挥手，送小船慢慢离开',3,v=>{boat.style.left=(51+v*30)+'%';poet.style.left=(51+v*30)+'%';hearts.forEach((h,i)=>h.style.opacity=v>(i+1)/4?1:0);shore.classList.toggle('waving',v>0);});place(wave,17,46,29,61);shore.hidden=true;
  const hint=()=>{pulse(wave);demo('hold',wave);};return{hint};
 }
 if(game==='lantern-route'){
  board.classList.add('dawn-story','river-scene');prop('gate',17,52,28,56);let dawn=false;
  const friend=person('friend',25,60,22,43),passenger=person('traveler',61,56,23,45);
  const sun=prop('sun',87,82,24,36,'rising-sun'),sunGoal=goal('sun',87,20,24,36);
  const boat=button('boat','天亮了，点小船送朋友出发',()=>{if(!dawn)return;boat.classList.add('boat-away');passenger.style.left='86%';passenger.style.top='43%';passenger.style.opacity='.4';friend.classList.add('waving');win();});place(boat,61,75,45,31);boat.classList.add('dawn-boat');boat.disabled=true;
  const range=slider('向上推太阳，雨夜变清晨，再点小船送朋友',{initial:100,target:-100,vertical:true,surface:board,range:[20,82],onvalue:v=>{if(dawn)return;const progress=1-v/100;sun.style.top=(82-progress*62)+'%';board.style.setProperty('--daylight',progress);paintProgress(progress*.65);if(v<12){dawn=true;range.disabled=true;boat.disabled=false;sunGoal.hidden=true;board.classList.add('day-arrived');hint();}}});
  const hint=()=>{if(dawn){pulse(boat);demo('tap',boat);}else{pulse(sun);demo('drag',sun,sunGoal);}};return{hint};
 }
 if(game==='return-trail'){
  board.classList.add('return-story');const gate=prop('gate',82,44,33,72);prop('flower',73,82,23,28).style.color='#e4c66c';
  const visitor=carry('traveler','沿着旧脚印，把刘郎带回花园门口',[17,64],gate,()=>{board.classList.add('garden-returned');gate.classList.add('receiving');person('traveler',81,49,24,49).classList.add('waving');win();},{w:31,h:65});
  [34,50,65].forEach((x,i)=>prop('foot',x,76-i*8,14,19,'old-footprint'));
  const hint=()=>visitor.hint();return{hint};
 }
 if(game==='cloud-steps'){
  board.classList.add('sky-stairs');prop('hill',50,75,100,66);const walker=person('child',14,83,20,33);let step=0;
  const points=[[17,84],[40,68],[64,51],[84,33]];
  const clouds=points.map(([x,y],i)=>{const b=button(i===3?'sun':'cloud',`点第${i+1}级云梯，向青天上走`,()=>{if(i!==step)return;b.classList.add('collected');place(walker,x,y-14,20,33);step++;paintProgress(step/4);if(step===4){walker.classList.add('waving');win();}else hint();});place(b,x,y,25,24);return b;});
  const hint=()=>{pulse(clouds[step]);demo('tap',clouds[step]);};return{hint};
 }
 if(game==='pottery-shape'){
  board.classList.add('pottery-story');let made=false;
  const bowl=prop('teabowl',50,44,74,75,'clay-bowl'),outline=goal('teabowl',50,44,74,75);outline.style.zIndex=0;
  const stamp=button('flower','给做好的茶碗印一朵小花',()=>{if(!made)return;bowl.classList.add('bowl-decorated');bowl.insertAdjacentHTML('beforeend','<span class="bowl-pattern">'+svg('flower')+'</span>');win();});place(stamp,83,81,25,31);stamp.hidden=true;
  const range=slider('左右拉开陶土，做成轮廓中的茶碗',{target:-100,surface:board,relative:true,stretch:true,travel:30,onvalue:v=>{if(made)return;bowl.style.setProperty('--bowl-width',.45+v*.0055);paintProgress(v/100*.7);if(v>94){made=true;range.disabled=true;stamp.hidden=false;board.classList.add('bowl-made');hint();}}});
  const hint=()=>made?(pulse(stamp),demo('tap',stamp)):demo('horizontal',bowl);return{hint};
 }
 if(game==='tower-stack'){
  board.classList.add('tower-story');prop('hill',51,57,97,58);let step=0;
  const slots=[goal('tier',50,61,61,27),goal('tier',50,41,47,24),goal('tier',50,23,34,23)];
  const positions=a.shuffle([0,1,2],'tower-story',0),pieces=[];
  positions.forEach((size,index)=>{let moving=false;const b=button('tier',`把${['最宽','中等','最窄'][size]}的一层放到城楼上`,()=>{if(size!==step||moving)return;moving=true;b.disabled=true;slots[size].classList.add('fitted');b.hidden=true;step++;paintProgress(step/3);if(step===3){prop('flag',52,13,17,24);board.classList.add('tower-built');win();}else hint();});place(b,18+index*32,87,28-size*4,23);b.dataset.size=size;pieces[size]=b;});
  const hint=()=>{pulse(pieces[step]);pulse(slots[step]);demo('drag',pieces[step],slots[step]);};
  // Tapping is the forgiving equivalent of placing a floor. Dragging also works.
  pieces.forEach((b,size)=>{let pointer,moved=false,origin,suppress=0;const tap=b.onclick;b.onclick=()=>{if(Date.now()>=suppress)tap();};const home=positions.indexOf(size),reset=()=>place(b,18+home*32,87,28-size*4,23);b.onpointerdown=e=>{if(!active()||size!==step)return;pointer=e.pointerId;origin=[e.clientX,e.clientY];moved=false;b.setPointerCapture(pointer);};b.onpointermove=e=>{if(pointer!==e.pointerId)return;if(Math.hypot(e.clientX-origin[0],e.clientY-origin[1])<7)return;moved=true;const r=board.getBoundingClientRect();place(b,(e.clientX-r.x)/r.width*100,(e.clientY-r.y)/r.height*100,28-size*4,23);};b.onpointerup=e=>{if(pointer!==e.pointerId)return;pointer=undefined;if(!moved)return;suppress=Date.now()+400;const t=slots[size].getBoundingClientRect();if(Math.hypot(e.clientX-t.x-t.width/2,e.clientY-t.y-t.height/2)<board.clientWidth*.25)tap();else reset();};const cancel=()=>{pointer=undefined;if(!b.hidden)reset();};b.onpointercancel=b.onlostpointercapture=cancel;pauses.push(cancel);});
  return{hint};
 }
 if(game==='harvest-sort'){
  board.classList.add('chestnut-story');prop('leaf',51,26,93,65,'chestnut-canopy');
  const basket=goal('basket',52,80,57,36);basket.classList.add('harvest-basket');let count=0;
  const fruit=[[24,35],[51,24],[77,38]].map((p,i)=>carry('nut',`把第${i+1}颗栗果放进篮子`,p,basket,()=>{const nut=document.createElement('span');nut.innerHTML=svg('nut');basket.append(nut);count++;paintProgress(count/3);if(count===3)win();else hint();},{w:24,h:30}));
  const leaf=button('leaf','小叶子留在树上',b=>{b.classList.add('leaf-sway');later(()=>b.classList.remove('leaf-sway'),450);});place(leaf,78,18,18,23);
  const hint=()=>fruit.find(item=>!item.node.disabled)?.hint();return{hint};
 }
 if(game==='outside-wall'){
  board.classList.add('village-story');prop('gate',51,59,46,64,'village-wall');prop('leaf',45,43,19,33);prop('leaf',65,47,17,29);let found=0;
  const hills=[[13,25,true],[51,69,false],[87,26,true]].map(([x,y,correct],i)=>{const b=button('hill',`${correct?'城墙外':'城墙内'}的第${i+1}座山`,()=>{if(!correct){pulse(board.querySelector('.village-wall'));return;}if(b.classList.contains('collected'))return;b.classList.add('collected');found++;paintProgress(found/2);if(found===2)win();else hint();});place(b,x,y,24,39);return b;});
  const hint=()=>{const next=hills.find((b,i)=>i!==1&&!b.classList.contains('collected'));pulse(next);demo('tap',next);};return{hint};
 }
 if(game==='bridge-mirror'){
  board.classList.add('reflection-story','river-scene');prop('bridge',50,27,72,42);
  const outline=goal('bridge',50,48,72,42);outline.style.transform='translate(-50%,-50%) scaleY(-1)';
  const values=a.shuffle(['mirror','upright','side'],'bridge-story','mirror');let correct;
  values.forEach((type,i)=>{let b;if(type==='mirror'){correct=carry('bridge',`选择第${i+1}个能接成圆桥洞的倒影`,[18+i*32,87],outline,()=>{outline.classList.add('fitted');board.classList.add('reflection-matched');board.querySelectorAll('.game-piece').forEach(x=>x.hidden=true);prop('fish',50,39,24,22,'mirror-fish');win();},{w:27,h:24});b=correct.node;}else{b=button('bridge',`选择第${i+1}个能接成圆桥洞的倒影`,()=>pulse(outline));place(b,18+i*32,87,27,24);}b.querySelector('svg').style.transform=type==='mirror'?'scaleY(-1)':type==='side'?'rotate(90deg)':'none';});
  const hint=()=>correct.hint();return{hint};
 }
}
