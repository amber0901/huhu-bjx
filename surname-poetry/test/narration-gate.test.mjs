import test from 'node:test';
import assert from 'node:assert/strict';
import {createNarrationGate} from '../public/poem/narration-gate.js';
import {surfaceValue} from '../public/poem/activity-state.js';
test('activities stay locked until the current listening round finishes, including replay',()=>{
 const gate=createNarrationGate();assert.equal(gate.open,false);
 const first=gate.begin();assert.equal(gate.open,false);assert.equal(gate.finish(first),true);assert.equal(gate.open,true);
 assert.equal(gate.finish(first),false);
 const replay=gate.begin();assert.equal(gate.open,false);assert.equal(gate.finish(first),false);assert.equal(gate.finish(replay),true);
});
test('reset or a new round invalidates delayed audio-ended callbacks',()=>{
 const gate=createNarrationGate(),old=gate.begin();gate.reset();assert.equal(gate.finish(old),false);assert.equal(gate.open,false);
 const next=gate.begin(),newer=gate.begin();assert.equal(gate.finish(next),false);assert.equal(gate.finish(newer),true);
});
test('the finger reaches the same physical endpoints as cloud, gate latch and sunrise props',()=>{
 for(const range of [[14,87],[37,74],[20,82]]){assert.equal(surfaceValue({position:range[0],range}),0);assert.equal(surfaceValue({position:range[1],range}),100);}
 assert.equal(surfaceValue({position:0,range:[20,82]}),0);assert.equal(surfaceValue({position:100,range:[20,82]}),100);
 assert.equal(surfaceValue({position:0,delta:-30,relative:true,stretch:true,travel:30}),100);
 assert.equal(surfaceValue({position:0,delta:6,initial:30,relative:true,stretch:true,travel:30}),50);
});
