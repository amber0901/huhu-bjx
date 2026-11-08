import test from 'node:test';
import assert from 'node:assert/strict';
import {createHoldProgress,shuffleChoices} from '../public/poem/activity-state.js';
function clock(){let time=0,id=0;const tasks=new Map();return{now:()=>time,schedule:fn=>{tasks.set(++id,fn);return id;},cancel:id=>tasks.delete(id),advance(ms){time+=ms;const batch=[...tasks.values()];tasks.clear();batch.forEach(fn=>fn());},peek:()=>[...tasks.values()][0],get pending(){return tasks.size;}};}
test('a released finger stops progress; pressing again cannot double the tick rate',()=>{
 const c=clock(),values=[];let finished=0;
 const hold=createHoldProgress({duration:1000,onProgress:v=>values.push(v),onFull:()=>finished++,...c});
 hold.start();c.advance(200);assert.equal(hold.value,.2);
 const stale=c.peek();hold.stop();c.advance(500);assert.equal(hold.value,.2);
 hold.start();stale();assert.equal(c.pending,1);c.advance(200);assert.equal(hold.value,.4);assert.equal(finished,0);
 hold.start();assert.equal(c.pending,1);c.advance(600);assert.equal(hold.value,1);assert.equal(finished,1);
 hold.start();c.advance(1000);assert.equal(finished,1);assert.equal(c.pending,0);
});
test('leaving or resetting a scene cancels held progress and ignores delayed callbacks',()=>{
 const c=clock();let finished=0,updates=0;
 const hold=createHoldProgress({duration:1000,onProgress:()=>updates++,onFull:()=>finished++,...c});
 hold.start();c.advance(100);const stale=c.peek();hold.destroy();c.advance(2000);stale();hold.start();
 assert.equal(hold.value,.1);assert.equal(updates,1);assert.equal(finished,0);assert.equal(c.pending,0);
});

test('replay changes the correct answer slot while preserving choices and source order',()=>{
 const choices=['left','correct','right'];let previous;
 for(let i=0;i<100;i++){
  const result=shuffleChoices(choices,'test-replay','correct');
  assert.deepEqual([...result].sort(),[...choices].sort());
  const slot=result.indexOf('correct');if(previous!==undefined)assert.notEqual(slot,previous);
  previous=slot;
 }
 assert.deepEqual(choices,['left','correct','right']);
});
