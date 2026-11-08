// A released finger must cancel its scheduled ticks before another press starts.
export function createHoldProgress({duration,onProgress,onFull,now=()=>performance.now(),schedule=fn=>setTimeout(fn,30),cancel=clearTimeout}){
 let value=0,active=false,destroyed=false,epoch=0,handle,last;
 const stop=()=>{active=false;epoch++;if(handle!==undefined)cancel(handle);handle=undefined;return value;};
 function start(){
  if(active||destroyed||value>=1)return;
  active=true;last=now();const run=++epoch;
  function tick(){
   if(!active||destroyed||run!==epoch)return;
   const time=now();value=Math.min(1,value+Math.max(0,time-last)/duration);last=time;onProgress(value);
   if(value>=1){stop();onFull();return;}
   handle=schedule(tick);
  }
  handle=schedule(tick);
 }
 return{start,stop,get value(){return value;},destroy(){stop();destroyed=true;}};
}

// Keep matching meaningful on replay: change the correct option slot.
export function surfaceValue({position,delta=0,initial=0,range=[0,100],relative=false,stretch=false,travel=50}){
 const value=relative?initial+(stretch?Math.abs(delta):delta)/travel*100:(position-range[0])/(range[1]-range[0])*100;
 return Math.max(0,Math.min(100,value));
}
const previousSlots=new Map();
export const shuffleChoices=(values,key,correct)=>{const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}if(key){let slot=result.indexOf(correct);if(slot===previousSlots.get(key)){const other=(slot+1+Math.floor(Math.random()*(result.length-1)))%result.length;[result[slot],result[other]]=[result[other],result[slot]];slot=other;}previousSlots.set(key,slot);}return result;};
