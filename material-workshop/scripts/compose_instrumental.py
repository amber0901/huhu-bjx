#!/usr/bin/env python3
"""Original pentatonic plucked-string bed. All sound is oscillator-based, no vocals."""
import hashlib
import json
from pathlib import Path
import subprocess
import wave

import numpy as np
from scipy.signal import lfilter

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'projects/wang-wuyixiang/source/instrumental-v2'
RATE=44100
SECONDS=64


def string_note(midi, seconds, seed):
    rng=np.random.default_rng(seed)
    frequency=440*2**((midi-69)/12)
    time=np.arange(round(seconds*RATE))/RATE
    sound=np.zeros(len(time))
    pluck=.21+rng.uniform(-.012,.012)
    for partial in range(1,19):
        # Freely decaying string modes; upper harmonics decay sooner.
        f=frequency*partial*np.sqrt(1+.000045*partial**2)
        decay=(2.4 if midi>=55 else 3.4)/partial**.64
        amplitude=np.sin(np.pi*partial*pluck)/partial**1.42
        sound+=amplitude*np.sin(2*np.pi*f*time)*np.exp(-time/decay)
    sound*=1-np.exp(-time/.0035)
    tail=min(len(sound),round(.15*RATE))
    sound[-tail:]*=np.linspace(1,0,tail)
    # A very small pick transient, not a breath, vocal sample or formant synth.
    transient=rng.normal(0,1,len(time))*np.exp(-time/.004)
    sound+=.007*lfilter([.18],[1,-.82],transient)
    return sound


def main():
    SOURCE.mkdir(parents=True,exist_ok=True)
    length=RATE*SECONDS
    output=np.zeros((length,2),dtype=np.float64)
    melodies=[
        [55,57,59,62], [59,57,55,50],
        [55,59,62,64], [62,59,57,55],
        [59,62,64,67], [64,62,59,57],
        [55,57,59,62], [59,57,55,55],
    ]
    score=[]
    def place(midi,start,velocity,pan,seed):
        note=string_note(midi,6.5 if midi<55 else 4.8,seed)*velocity
        indices=(round(start*RATE)+np.arange(len(note)))%length
        for channel,gain in enumerate([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)]):
            np.add.at(output[:,channel],indices,note*gain)
        score.append({'midi':midi,'startSeconds':round(start,3),'velocity':velocity,'pan':pan})
    for bar,phrase in enumerate(melodies):
        for beat,midi in enumerate(phrase):
            start=bar*8+beat*2+.32+[0,.06,-.02,.04][beat]
            place(midi,start,[.12,.095,.105,.085][beat],[-.14,.1,-.08,.14][beat],bar*17+beat)
        place(43 if bar%2==0 else 50,bar*8+.34,.047,-.2,100+bar)
        if bar in [1,3,5,7]:place(55,bar*8+5.5,.032,.25,200+bar)
    # Circular room reflections preserve the loop; no sustained choir or pad layers.
    dry=output.copy()
    for delay,gain in [(.071,.12),(.137,.08),(.227,.045),(.359,.025)]:
        output+=np.roll(dry,round(delay*RATE),axis=0)*gain
    output*=.78/max(1,np.max(np.abs(output)))
    raw=SOURCE/'original-strings.wav'
    with wave.open(str(raw),'wb') as file:
        file.setnchannels(2);file.setsampwidth(2);file.setframerate(RATE)
        file.writeframes(np.clip(output*32767,-32768,32767).astype('<i2').tobytes())
    target=SOURCE/'music-instrumental-v2.mp3'
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af','loudnorm=I=-28:TP=-5:LRA=7','-ar','44100','-ac','2','-c:a','libmp3lame','-b:a','192k',str(target)],check=True)
    report={'title':'江南暮归','composition':'Original G pentatonic plucked-string miniature','method':'Modal additive string synthesis and short room reflections','vocalSources':[],'sampleSources':[],'generativeMusicModelUsed':False,'durationSeconds':64,'sampleRate':RATE,'targetLufs':-28,'loop':'Circular note tails and circular room reflections','sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'score':score,'note':'合成拨弦音色，非真人古筝录音；仅器乐，未使用声音/人声/合唱采样。'}
    (SOURCE/'score-and-production.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('已制作原创五声音阶拨弦纯音乐：64秒，无人声源。')
    print(target)


if __name__=='__main__':main()
