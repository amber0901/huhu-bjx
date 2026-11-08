#!/usr/bin/env python3
"""Local speech-to-text QA, independent from the generating service's subtitles."""
import argparse
from difflib import SequenceMatcher
import hashlib
import json
from pathlib import Path
import re
import subprocess

import mlx_whisper
from opencc import OpenCC

converter=OpenCC('t2s')
def normalized(text):
    return ''.join(re.findall(r'[\u3400-\u9fff]',converter.convert(text))).replace('惟','唯')

def measure(file):
    result=subprocess.run(['ffmpeg','-hide_banner','-i',str(file),'-af','loudnorm=I=-18:TP=-2:LRA=7:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
    start=result.stderr.rfind('{')
    values=json.loads(result.stderr[start:result.stderr.rfind('}')+1])
    return {key:float(values[key]) for key in ['input_i','input_tp','input_lra']}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('projects',type=Path,nargs='+')
    parser.add_argument('--model',default='mlx-community/whisper-small-mlx')
    parser.add_argument('--speech-only',action='store_true')
    args=parser.parse_args()
    for directory in args.projects:
        project=directory.resolve()
        poem=json.loads((project/'poem.json').read_text())
        report={'localModel':args.model,'note':'本地转写为独立自动检查，不代替教师对音色、节奏与儿童适读性的评价。','files':{}}
        for kind in ['narration','guidance']+([] if args.speech_only else ['music']):
            file=project/'release'/poem['assets'][kind]
            print(f"{poem['id']}: 本地核对 {kind}",flush=True)
            output=mlx_whisper.transcribe(str(file),path_or_hf_repo=args.model,language='zh',temperature=0,word_timestamps=kind=='narration',verbose=False,condition_on_previous_text=False)
            expected=''.join(poem['lines']) if kind=='narration' else poem.get('guidanceText','') if kind=='guidance' else ''
            actual=output.get('text','').strip()
            item={'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'transcript':actual,'loudness':measure(file),'segments':output.get('segments',[])}
            if expected:
                item['expected']=expected
                item['textMatches']=normalized(expected)==normalized(actual)
                item['similarity']=round(SequenceMatcher(None,normalized(expected),normalized(actual)).ratio(),4)
                print(f"  转写：{actual}",flush=True)
                print(f"  文字匹配：{item['textMatches']}；相似度 {item['similarity']}",flush=True)
            else:
                item['possibleVocals']=any(segment.get('no_speech_prob',1)<0.3 and segment.get('avg_logprob',-100)>-0.5 and len(normalized(segment.get('text','')))>4 for segment in output.get('segments',[]))
                print(f"  配乐疑似人声标记：{item['possibleVocals']}",flush=True)
            report['files'][kind]=item
            (project/'source/local-audio-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':
    main()
