#!/usr/bin/env python3
"""Align the known poem to actual audio; independently transcribe for QA."""
import hashlib
import argparse
import json
from pathlib import Path
import re
import subprocess
import wave

import mlx.core as mx
import mlx_whisper
from mlx_whisper.audio import N_FRAMES, N_SAMPLES, log_mel_spectrogram, pad_or_trim
from mlx_whisper.load_models import load_model
from mlx_whisper.timing import find_alignment
from mlx_whisper.tokenizer import get_tokenizer

from generate_audio import STUDIO, json_write

MODEL = 'mlx-community/whisper-small-mlx'
HAN = re.compile(r'[\u3400-\u9fff]')


def silences(file, duration):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(file), '-af', 'silencedetect=noise=-38dB:d=0.12', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    intervals, start = [], None
    for event,value in re.findall(r'silence_(start|end): ([0-9.]+)', result.stderr):
        if event == 'start': start = float(value)
        elif start is not None:
            intervals.append([start,float(value)])
            start = None
    if start is not None: intervals.append([start,duration])
    return intervals


def main():
    project = STUDIO/'projects/wang-wuyixiang'
    parser=argparse.ArgumentParser()
    parser.add_argument('--draft-root',type=Path,default=project/'drafts/voice-review-v3')
    parser.add_argument('--poem-file',type=Path,default=project/'poem.json')
    parser.add_argument('--narration-only',action='store_true')
    args=parser.parse_args()
    poem = json.loads(args.poem_file.read_text())
    if args.draft_root.name=='voice-review-v3' and poem.get('materialVersion',2)>=4:
        raise ValueError('历史整诗试听必须配套历史原文，请指定 --poem-file projects/wang-wuyixiang/source/previous-release-v2/poem.json')
    expected = ''.join(poem['lines'])
    model = load_model(MODEL, dtype=mx.float16)
    tokenizer = get_tokenizer(model.is_multilingual, num_languages=model.num_languages, language='zh', task='transcribe')
    for draft in sorted(args.draft_root.iterdir()):
        if not (draft/'production.json').exists(): continue
        file = draft/'narration.wav'
        with wave.open(str(file),'rb') as audio:
            duration = audio.getnframes()/audio.getframerate()
        if duration >= 29: raise ValueError('此短诗对齐工具仅处理30秒以内样本')
        print(draft.name+': 对齐实际音频',flush=True)
        mel = log_mel_spectrogram(str(file), n_mels=model.dims.n_mels, padding=N_SAMPLES)
        frames = mel.shape[-2]-N_FRAMES
        alignment = find_alignment(model,tokenizer,tokenizer.encode(expected),pad_or_trim(mel,N_FRAMES,axis=-2).astype(mx.float16),frames)
        words = [{'text':w.word,'start':float(w.start),'end':float(w.end),'probability':float(w.probability)} for w in alignment if HAN.search(w.word)]
        assert ''.join(''.join(HAN.findall(w['text'])) for w in words) == ''.join(HAN.findall(expected))
        lines, offset = [], 0
        for line in poem['lines']:
            group, count = [], 0
            wanted = len(HAN.findall(line))
            while count < wanted:
                item = words[offset]; group.append(item); offset += 1
                count += len(HAN.findall(item['text']))
            assert count == wanted, '字词不能跨行分配'
            lines.append({'text':line, 'start':round(group[0]['start'],3), 'end':round(group[-1]['end'],3)})
        intervals = silences(file,duration)
        edge_refinements=[]
        for a,b in intervals:
            if a<=.02 and 0<b<.8 and b<words[0]['end'] and abs(b-lines[0]['start'])<.6:
                edge_refinements.append({'edge':'start','dtw':lines[0]['start'],'waveform':b})
                lines[0]['start']=round(b,3)
            if b>=duration-.02 and a>words[-1]['start'] and abs(a-lines[-1]['end'])<.35:
                edge_refinements.append({'edge':'end','dtw':lines[-1]['end'],'waveform':a})
                lines[-1]['end']=round(a,3)
        refinements = []
        for index in range(len(lines)-1):
            before, after = lines[index], lines[index+1]
            center = (before['end']+after['start'])/2
            nearby = [pair for pair in intervals if pair[1]-pair[0]>=.2 and pair[0]>before['start']+.5 and pair[1]<after['end']-.5 and abs((pair[0]+pair[1])/2-center)<.4]
            if nearby:
                a,b = min(nearby,key=lambda pair:abs((pair[0]+pair[1])/2-center))
                refinements.append({'afterLine':index+1,'dtwEnd':before['end'],'dtwNextStart':after['start'],'silenceStart':a,'silenceEnd':b})
                before['end'],after['start'] = round(a,3),round(b,3)
        previous = 0
        for line in lines:
            assert previous <= line['start'] < line['end'] <= duration
            previous = line['end']
        json_write(draft/'timing.json',{'unit':'seconds','source':'本地Whisper跨注意力DTW强制对齐已核定诗文，并用实际波形静音边界校准；未等分时长。','model':MODEL,'audioSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'lines':lines})
        raw = {'alignmentType':'known-text forced alignment; not an independent recognition pass','words':words,'silences':intervals,'refinements':refinements,'edgeRefinements':edge_refinements,'lineGapsSeconds':[round(b['start']-a['end'],3) for a,b in zip(lines,lines[1:])]}
        json_write(draft/'alignment-check.json',raw)
        # This second pass receives no poem text. Do not replace its spelling with expected text.
        qa = {'model':MODEL,'initialPrompt':None,'files':{}}
        for kind in (['narration'] if args.narration_only else ['narration','guidance']):
            print(draft.name+': 独立转写 '+kind,flush=True)
            item = mlx_whisper.transcribe(str(draft/f'{kind}.wav'),path_or_hf_repo=MODEL,language='zh',temperature=0,verbose=None,condition_on_previous_text=False)
            qa['files'][kind] = {'text':item['text'],'segments':item['segments']}
            print(item['text'],flush=True)
        json_write(draft/'independent-asr.json',qa)
        print('实测句间静音：'+str(raw['lineGapsSeconds']),flush=True)


if __name__ == '__main__': main()
