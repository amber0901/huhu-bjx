#!/usr/bin/env python3
"""Independent local VAD screen; never equates no detection with no singing."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import numpy as np
import onnxruntime as ort


def main():
    parser=argparse.ArgumentParser();parser.add_argument('audio',type=Path);parser.add_argument('--out',type=Path,required=True);args=parser.parse_args()
    model=Path(__file__).resolve().parents[1]/'.cache/silero-vad/silero_vad.onnx'
    options=ort.SessionOptions();options.intra_op_num_threads=1;options.inter_op_num_threads=1
    session=ort.InferenceSession(str(model),options,providers=['CPUExecutionProvider'])
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(args.audio),'-ar','16000','-ac','1','-f','f32le','-'],capture_output=True,check=True).stdout
    data=np.frombuffer(raw,dtype='<f4');state=np.zeros((2,1,128),np.float32);context=np.zeros((1,64),np.float32);frames=[]
    for start in range(0,len(data),512):
        frame=np.pad(data[start:start+512],(0,max(0,512-len(data[start:start+512]))))[None,:]
        sample=np.concatenate((context,frame),axis=1)
        out,state=session.run(None,{'input':sample,'state':state,'sr':np.array(16000,dtype=np.int64)})
        context=sample[:,-64:];frames.append(float(out[0,0]))
    spans=[];begin=None
    for i,value in enumerate(frames+[0]):
        if value>=.5 and begin is None:begin=i
        if value<.5 and begin is not None:
            if i-begin>=9:spans.append([round(begin*.032,3),round(i*.032,3)])
            begin=None
    windows=[]
    for start in range(0,len(frames),313):
        values=frames[start:start+313];windows.append({'start':round(start*.032,2),'end':round(min((start+313)*.032,len(data)/16000),2),'maxProbability':round(max(values),4),'framesOverThreshold':sum(v>=.5 for v in values)})
    report={'model':'Silero VAD','modelSource':'https://github.com/snakers4/silero-vad','modelSha256':hashlib.sha256(model.read_bytes()).hexdigest(),'audioSha256':hashlib.sha256(args.audio.read_bytes()).hexdigest(),'durationSeconds':len(data)/16000,'threshold':.5,'minSpanSeconds':.288,'speechLikeSpans':spans,'windows':windows,'limitations':'检测语音活动，可能漏检演唱/哼唱或把乐器误判为语音。结合独立ASR筛查，仍需用户试听，不能据此认定绝无人声。'}
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__':main()
