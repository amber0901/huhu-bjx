#!/usr/bin/env python3
"""Make Wang-only auditions, preserving native prosody and every API response."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import wave

from generate_audio import STUDIO, config, json_write, tts

VOICES = [
    {'id': 'soft-402001', 'voiceType': 402001, 'name': '温柔姐姐 · 云小团', 'description': '温柔甜美女声，优先试听这一版。'},
    {'id': 'teacher-403005', 'voiceType': 403005, 'name': '女老师 · 云雅琴', 'description': '沉稳女老师，比较老师带读的感觉。'},
    {'id': 'child-403000', 'voiceType': 403000, 'name': '小伙伴 · 云小朵', 'description': '特色女童声，比较小伙伴朗读的感觉。'},
]
TEXT = '<speak>朱雀桥边野草花，<break time="300ms"/>乌衣巷口夕阳<phoneme alphabet="py" ph="xie2">斜</phoneme>。<break time="500ms"/>旧时王谢堂前燕，<break time="300ms"/>飞入寻常百姓家。</speak>'


def normalize_gain(original, destination):
    command = ['ffmpeg', '-hide_banner', '-i', str(original), '-af', 'loudnorm=I=-20:TP=-2:LRA=7:print_format=json', '-f', 'null', '-']
    result = subprocess.run(command, capture_output=True, text=True, check=True)
    measured = json.loads(result.stderr[result.stderr.rfind('{'):result.stderr.rfind('}')+1])
    gain = min(-20-float(measured['input_i']), -2-float(measured['input_tp']))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(original), '-af', f'volume={gain:.4f}dB', '-c:a', 'pcm_s16le', str(destination)], check=True)
    with wave.open(str(destination), 'rb') as audio:
        duration = audio.getnframes()/audio.getframerate()
        rate = audio.getframerate()
    return {'gainDb': round(gain,4), 'durationSeconds': duration, 'sampleRate': rate, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'atempo': None, 'insertedSilenceSeconds': 0}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--voice', choices=[v['id'] for v in VOICES])
    args = parser.parse_args()
    project = STUDIO/'projects/wang-wuyixiang'
    poem = json.loads((project/'poem.json').read_text())
    original_config = config()
    for voice in VOICES:
        if args.voice and voice['id'] != args.voice:
            continue
        source = project/'source/voice-review-v3'/voice['id']
        draft = project/'drafts/voice-review-v3'/voice['id']
        source.mkdir(parents=True,exist_ok=True)
        draft.mkdir(parents=True,exist_ok=True)
        values = {**original_config, 'TTS_VOICE_TYPE':str(voice['voiceType']), 'TTS_SPEED':'-0.25', 'TTS_SAMPLE_RATE':'24000', 'TTS_ENABLE_SUBTITLE':'true'}
        report = {'voice':voice, 'status':'awaiting-listening-review', 'generation':{'speed':-.25, 'sampleRate':24000, 'extraCommaBreakMs':300, 'extraSentenceBreakMs':500, 'nativeProsody':True}, 'files':{}}
        for part,text in [('narration',TEXT),('guidance',poem['guidanceText'])]:
            original = source/f'{part}.wav'
            response_file = source/f'{part}-response.json'
            if original.exists() or response_file.exists():
                if not original.exists() or not response_file.exists():
                    raise ValueError('音频或响应缺失，先核对调用状态，不重复生成')
                response = json.loads(response_file.read_text())
                if response['settings']['Text'] != text or response['settings']['Speed'] != -.25:
                    raise ValueError('旧版本参数不同，先归档后生成')
                print(voice['id']+': 复用 '+part,flush=True)
            else:
                print(voice['id']+': 生成 '+part,flush=True)
                audio,response = tts(values,text)
                original.write_bytes(audio)
                json_write(response_file,response)
            report['files'][part] = normalize_gain(original,draft/f'{part}.wav')
            report['files'][part]['providerSubtitleCount'] = len(response['subtitles'])
        json_write(draft/'production.json',report)
        print(voice['id']+': 样本保存完成；仅恒定增益，未变速、变调或切句补静音。',flush=True)


if __name__ == '__main__':
    main()
