#!/usr/bin/env python3
"""Inspect real media, timing and requested phonemes without reading credentials."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess

from publish_assets import validate


def media(file):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_name,sample_rate,channels', '-of', 'json', str(file)], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def loudness(file):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(file), '-af', 'loudnorm=I=-18:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    data = json.loads(result.stderr[result.stderr.rfind('{'):result.stderr.rfind('}')+1])
    return {'integratedLufs': float(data['input_i']), 'truePeakDbtp': float(data['input_tp'])}


def inspect(project):
    release = project/'release'
    poem, files = validate(release)
    report = {'id': poem['id'], 'scope': '文件、编码、响度、字幕音素与时间轴检查；不是人工听感或儿童实机验收。', 'assets': {}}
    for kind, name in poem['assets'].items():
        file = release/name
        item = {'file': name, 'bytes': file.stat().st_size, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
        if kind in ['narration', 'guidance', 'music']:
            probe = media(file)
            item.update(durationSeconds=float(probe['format']['duration']), streams=probe['streams'], loudness=loudness(file))
            assert item['loudness']['truePeakDbtp'] <= -1, f'{kind} 峰值过高'
        elif kind in ['background','companion']:
            with file.open('rb') as stream:
                header = stream.read(24)
            assert header[:8] == b'\x89PNG\r\n\x1a\n', '本轮背景应为 PNG'
            width, height = struct.unpack('>II', header[16:24])
            if kind=='background':assert abs(width/height-16/9) < .01, '背景比例不适合横屏'
            else:
                with file.open('rb') as stream:png_header=stream.read(26)
                assert png_header[25] in [4,6], '互动伙伴应保留 PNG alpha 通道'
                item['hasAlphaChannel']=True
            item.update(width=width,height=height)
        report['assets'][kind] = item
    duration = report['assets']['narration']['durationSeconds']
    timing = json.loads((release/poem['assets']['timing']).read_text())['lines']
    assert timing[-1]['end'] <= duration, '末句超出音频'
    gaps = [round(b['start']-a['end'], 3) for a,b in zip(timing,timing[1:])]
    minimum_gap=.15 if poem.get('materialVersion',2)>=4 else .899
    assert all(gap>=minimum_gap for gap in gaps),'句间停顿不足'
    timing_data=json.loads((release/poem['assets']['timing']).read_text())
    if 'audioSha256' in timing_data:assert timing_data['audioSha256']==report['assets']['narration']['sha256'],'音频与对齐记录不一致'
    report['timing'] = {'lineCount': len(timing), 'minimumGapSeconds': min(gaps), 'lastLineEndSeconds': timing[-1]['end'], 'withinAudioDuration': True}
    response_file=project/('source/couplet-v4/response.json' if poem.get('materialVersion',2)>=4 else 'source/narration-tts-response.json')
    response = json.loads(response_file.read_text())
    report['phonemeChecks'] = []
    for character, expected in poem.get('pronunciationChecks', {}).items():
        if not response['subtitles']:break
        actual = [item.get('Phoneme') for item in response['subtitles'] if item.get('Text') == character]
        assert actual and all(value == expected for value in actual), f'{character} 的合成音素不符合指定读音'
        report['phonemeChecks'].append({'character': character, 'expected': expected, 'actual': actual, 'matches': True})
    if not response['subtitles']:report['phonemeNote']='当前童声音色未返回音素，不声称通过服务端音素检查；另保留未提供原文提示的独立转写。'
    asr = project/('drafts/couplet-v4/child-403000/independent-asr.json' if poem.get('materialVersion',2)>=4 else 'source/local-audio-qa.json')
    if asr.exists():
        raw = json.loads(asr.read_text())
        report['independentAsr'] = {key: {field: value for field, value in item.items() if field in ['text','transcript', 'expected', 'textMatches', 'similarity']} for key, item in raw.get('files', {}).items()}
        report['asrNote'] = '保留独立转写的真实差异；古诗转写有同音异字和漏字，未把文字匹配失败改写为通过。'
    (project/'source/release-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('projects', type=Path, nargs='+')
    args = parser.parse_args()
    for project in args.projects:
        report = inspect(project.resolve())
        print(f"{report['id']}: 编码、响度、{report['timing']['lineCount']}句时间轴检查通过；已核对音素 {len(report['phonemeChecks'])} 项")
