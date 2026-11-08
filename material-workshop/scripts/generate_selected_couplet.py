#!/usr/bin/env python3
"""Generate a verified surname excerpt, reusing immutable paid-call results."""
import argparse
import json
from pathlib import Path
from xml.sax.saxutils import escape
from generate_audio import STUDIO,config,json_write,tts
from generate_wang_voice_review import normalize_gain

def main():
    parser=argparse.ArgumentParser();parser.add_argument('project',type=Path);args=parser.parse_args()
    project=args.project.resolve();poem=json.loads((project/'poem.json').read_text())
    assert len(poem['lines'])==2 and any(s in ''.join(poem['lines']) for s in poem['surnames'])
    source=project/'source/couplet-v4';draft=project/'drafts/couplet-v4/child-403000'
    source.mkdir(parents=True,exist_ok=True);draft.mkdir(parents=True,exist_ok=True)
    text='<speak>'+escape(poem['lines'][0])+'<break time="300ms"/>'+escape(poem['lines'][1])+'</speak>'
    audio_file,response_file=source/'narration.wav',source/'response.json'
    if audio_file.exists() or response_file.exists():
        if not audio_file.exists() or not response_file.exists():raise ValueError('先核对已有调用状态，不重复提交')
        response=json.loads(response_file.read_text())
        assert response['settings']['Text']==text and response['settings']['Speed']==-.65,'参数不同，先归档'
        print('复用已有朗诵：'+poem['id'],flush=True)
    else:
        values={**config(),'TTS_VOICE_TYPE':'403000','TTS_SPEED':'-0.65','TTS_SAMPLE_RATE':'24000','TTS_ENABLE_SUBTITLE':'true'}
        audio,response=tts(values,text);audio_file.write_bytes(audio);json_write(response_file,response)
    info=normalize_gain(audio_file,draft/'narration.wav')
    json_write(draft/'poem.json',poem)
    json_write(draft/'production.json',{'status':'sample-ready','voice':poem['voice'],'generation':{'speed':-.65,'sampleRate':24000,'extraCommaBreakMs':300,'nativeProsody':True},'files':{'narration':info}})
    print(poem['id']+' 朗诵 '+str(round(info['durationSeconds'],3))+' 秒',flush=True)
if __name__=='__main__':main()
