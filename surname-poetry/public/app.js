import { setIconButton } from '/ui.js';
import { cacheMaterials } from '/cache-client.js';
const $ = id => document.getElementById(id);
const views = ['write','result','message','loading','gate'];
const canvas = $('handwriting'), context = canvas.getContext('2d');
let strokes = [], activeStroke, pointerId, result, lastImage, request, run = 0, catalog = [];
let retryAvailable = false, retryHandler;

function show(name) {
  document.body.dataset.view = name;
  for (const view of views) $(`${view}-view`).hidden = view !== name;
  $('notice').textContent = '';
  // Focus the page heading after a view change without opening a mobile keyboard.
  const heading = $(`${name}-view`).querySelector('h1');
  heading.tabIndex = -1;
  heading.focus({preventScroll:true});
}
function announce(text) {
  $('notice').textContent=text;
  $('teacher-notice').textContent=text;
  const paper=document.querySelector('.paper');
  paper.classList.remove('needs-ink');
  requestAnimationFrame(()=>paper.classList.add('needs-ink'));
}
function updateButtons() {
  const empty = strokes.length === 0;
  $('undo').disabled = empty; $('clear').disabled = empty; $('recognize').disabled = empty || Boolean(activeStroke);
  $('canvas-placeholder').hidden = !empty;
}
function redraw() {
  context.clearRect(0,0,800,800);
  context.lineWidth = 15; context.strokeStyle = '#34564a'; context.fillStyle = '#34564a'; context.lineCap = 'round'; context.lineJoin = 'round';
  for (const points of strokes) {
    if (points.length === 1) {context.beginPath();context.arc(points[0].x,points[0].y,7.5,0,Math.PI*2);context.fill();continue;}
    context.beginPath(); context.moveTo(points[0].x,points[0].y);
    for (let index=1;index<points.length-1;index++) {
      const next=points[index+1], point=points[index];
      context.quadraticCurveTo(point.x,point.y,(point.x+next.x)/2,(point.y+next.y)/2);
    }
    const last=points.at(-1);context.lineTo(last.x,last.y);context.stroke();
  }
  updateButtons();
}
function point(event) {
  const rect=canvas.getBoundingClientRect();
  return {x:Math.max(8,Math.min(792,(event.clientX-rect.left)/rect.width*800)),y:Math.max(8,Math.min(792,(event.clientY-rect.top)/rect.height*800))};
}
canvas.addEventListener('pointerdown', event=>{
  if (pointerId!==undefined || (event.pointerType==='mouse' && event.button!==0)) return;
  if (strokes.length>=50) {announce('笔画有点多啦，可以重写一次');return;}
  event.preventDefault();pointerId=event.pointerId;canvas.setPointerCapture(pointerId);
  activeStroke=[point(event)];strokes.push(activeStroke);redraw();
});
canvas.addEventListener('pointermove',event=>{
  if(event.pointerId!==pointerId || !activeStroke)return;
  const samples=event.getCoalescedEvents?.();
  for(const sample of (samples?.length ? samples : [event])) {
    const next=point(sample), last=activeStroke.at(-1);
    if(Math.hypot(next.x-last.x,next.y-last.y)>=2 && activeStroke.length<1500)activeStroke.push(next);
  }
  redraw();
});
function endStroke(event) {
  if(event.pointerId!==pointerId)return;
  activeStroke=undefined;pointerId=undefined;redraw();
}
canvas.addEventListener('pointerup',endStroke);
canvas.addEventListener('pointercancel',endStroke);
canvas.addEventListener('lostpointercapture',endStroke);
$('undo').onclick=()=>{strokes.pop();activeStroke=undefined;pointerId=undefined;redraw();};
$('clear').onclick=()=>{strokes=[];activeStroke=undefined;pointerId=undefined;redraw();$('notice').textContent='';};

function exportInk() {
  // Send only cropped ink on white paper, without the guide or UI text.
  const points=strokes.flat(), xs=points.map(p=>p.x), ys=points.map(p=>p.y);
  const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
  if (Math.max(right-left,bottom-top)<25 || points.length<5) return null;
  const side=Math.min(800,Math.max(160,right-left,bottom-top)+110);
  const x=Math.max(0,Math.min(800-side,(left+right-side)/2));
  const y=Math.max(0,Math.min(800-side,(top+bottom-side)/2));
  const output=document.createElement('canvas');output.width=512;output.height=512;
  const ctx=output.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,512,512);ctx.drawImage(canvas,x,y,side,side,0,0,512,512);
  return output.toDataURL('image/png');
}
async function api(url, options={}) {
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();
  if(!response.ok)throw Object.assign(new Error(data.error || '暂时没连上，请稍后再试'),{code:data.code,status:response.status});
  return data;
}
function message(title,copy,symbol='',retry=false,handler=recognize,visual='hourglass') {
  $('message-heading').textContent=title;$('message-copy').textContent=copy;$('message-symbol').textContent=symbol;
  $('message-symbol').dataset.compound=String(symbol.length>1);
  setIconButton($('try-again'),'pencil',retry?'返回修改':'再写一次');
  $('message-icon').querySelector('use').setAttribute('href',`/icons.svg#${visual}`);
  $('teacher-notice').textContent=title+'。'+copy;
  retryAvailable=retry;retryHandler=handler;$('retry-network').hidden=!retry;show('message');
}
async function recognize() {
  const image=exportInk();
  if(!image){announce('再写大一点点，让小精灵看清楚吧');return;}
  lastImage=image;request?.abort();request=new AbortController();const controller=request,current=++run;
  show('loading');const timer=setTimeout(()=>controller.abort(),35000);
  try {
    const data=await api('/api/recognize',{method:'POST',body:JSON.stringify({image}),signal:request.signal});
    if(current!==run)return;
    if(data.status==='unclear'){message('小精灵还没看清','把姓写大一点，我们再试一次吧。','',false,recognize,'question');return;}
    result=data;$('recognized-character').textContent=data.surname;$('recognized-character').dataset.compound=String(data.surname.length>1);$('written-sample').src=image;show('result');
  } catch(error) {
    if(current!==run)return;
    if(error.status===401){show('gate');return;}
    message('识别服务暂时没连上',error.name==='AbortError'?'这次等得有点久，请再试一下。':error.message,'',true,recognize,'cloud-off');
  } finally {clearTimeout(timer);if(current===run)request=undefined;}
}
$('recognize').onclick=recognize;
$('cancel').onclick=()=>{run++;request?.abort();request=undefined;show('write');};
$('rewrite').onclick=()=>{strokes=[];redraw();show('write');};
$('try-again').onclick=()=>{if(!retryAvailable){strokes=[];redraw();}show('write');};
$('retry-network').onclick=()=>retryHandler?.();
$('confirm').onclick=()=>{
  const matches=catalog.filter(poem=>poem.surnames.includes(result.surname));
  if(!matches.length){message(`${result.surname}的诗词还在路上`,'小精灵正在收集这个姓的诗，准备好就请你来玩。',result.surname);return;}
  const selected=matches[Math.floor(Math.random()*matches.length)];
  $('poem-frame').src=`/poem/index.html?surname=${encodeURIComponent(result.surname)}&poem=${encodeURIComponent(selected.id)}`;
  $('poem-view').hidden=false;document.body.classList.add('poem-active');
  document.title=`百家姓 · ${result.surname}`;
};
window.addEventListener('message',event=>{
  if(event.origin!==location.origin || event.source!==$('poem-frame').contentWindow || event.data?.type!=='return-to-write')return;
  $('poem-view').hidden=true;$('poem-frame').removeAttribute('src');document.body.classList.remove('poem-active');
  strokes=[];result=undefined;lastImage=undefined;redraw();show('write');document.title='百家姓';
});
$('fullscreen').onclick=async()=>{
  try {if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{announce('可以请老师使用浏览器的全屏按钮');}
};
document.addEventListener('fullscreenchange',()=>setIconButton($('fullscreen'),document.fullscreenElement?'collapse':'expand',document.fullscreenElement?'退出全屏':'全屏'));
$('classroom-form').onsubmit=async event=>{
  event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;
  try{await api('/api/session',{method:'POST',body:JSON.stringify({code:$('classroom-code').value})});$('classroom-code').value='';$('gate-error').textContent='';show('write');}
  catch(error){$('gate-error').textContent=error.message;}
  finally{button.disabled=false;}
};
async function connect() {
  $('refresh-status').disabled=true;
  try {
    const [config,data]=await Promise.all([api('/api/config'),api('/api/catalog')]);catalog=data.poems;$('class-materials').textContent='本期素材：'+[...new Set(catalog.flatMap(p=>p.surnames))].join('、')+'。';
    cacheMaterials(data.poems,$('cache-status'));
    $('service-status').textContent=config.visionConfigured?'识别服务已配置，诗词素材已连接。':'识别尚未配置，请在服务端填写 TOKENHUB_API_KEY 后重启。';
    if(config.authRequired&&!config.authorized)show('gate');
    else if(!config.visionConfigured){message('请老师连接百家姓','识别服务还没准备好，配置完成后就能开始写字啦。','',false,connect,'cloud-off');}
    else if(!$('gate-view').hidden)show('write');
  } catch {message('百家姓暂时没连上','请老师检查网络，稍后再试。','',true,connect,'cloud-off');}
  finally{$('refresh-status').disabled=false;}
}
$('refresh-status').onclick=connect;
redraw();connect();
