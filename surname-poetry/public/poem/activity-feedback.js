// Tiny synthesized instrument accents, no samples, speech or vocals.
export function createActivitySound(){
 let audio,closed=false;
 return{play(kind='bell'){
  if(closed)return;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audio ||= new Audio();audio.resume().catch(()=>{});
  const node=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
  node.type='sine';node.frequency.setValueAtTime(kind==='drum'?130:659.25,now);
  if(kind==='drum')node.frequency.exponentialRampToValueAtTime(58,now+.14);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.025,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.23);
  node.connect(gain).connect(audio.destination);node.start(now);node.stop(now+.25);node.onended=()=>{node.disconnect();gain.disconnect();};
 },destroy(){closed=true;audio?.close().catch(()=>{});}};
}
