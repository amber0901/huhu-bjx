#!/usr/bin/env python3
"""Master an isolated generated instrumental candidate without publishing it."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

from check_materials import media, loudness
from generate_audio import json_write


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('project',type=Path)
    parser.add_argument('--version',default='music-v3-26')
    parser.add_argument('--max-duration',type=float,default=90)
    parser.add_argument('--segments',required=True,help='经筛查的器乐时间段，如 0:13.5,30.2:49.5；不自动认定整首无人声')
    args=parser.parse_args()
    if not 20 <= args.max_duration <= 180:
        raise ValueError('样板时长应为20–180秒')
    source=args.project.resolve()/'source'/args.version
    original=source/'generated-original.mp3'
    duration=float(media(original)['format']['duration'])
    ranges=[tuple(map(float,pair.split(':'))) for pair in args.segments.split(',')]
    if any(len(pair)!=2 or pair[0]<0 or pair[1]<=pair[0] or pair[1]>duration for pair in ranges):raise ValueError('选段范围异常')
    join=1.5
    if any(b-a<=join*2 for a,b in ranges):raise ValueError('器乐选段太短')
    prefix='[0:a]asplit='+str(len(ranges))+''.join(f'[s{i}]' for i in range(len(ranges)))+';' if len(ranges)>1 else '[0:a]anull[s0];'
    for i,(a,b) in enumerate(ranges):prefix+=f'[s{i}]atrim={a}:{b},asetpts=PTS-STARTPTS[p{i}];'
    current='p0'
    for i in range(1,len(ranges)):
        label=f'j{i}';prefix+=f'[{current}][p{i}]acrossfade=d={join}:c1=tri:c2=tri[{label}];';current=label
    length=min(sum(b-a for a,b in ranges)-join*(len(ranges)-1),args.max_duration)
    if length<15:raise ValueError('器乐选段太短，先核对生成结果')
    overlap=2.5
    # Output starts and ends at the same source point. Tail/head blend keeps a
    # continuous boundary instead of fading to silence at each repetition.
    graph=(prefix+f'[{current}]atrim=0:{length},asetpts=PTS-STARTPTS,highpass=f=55,lowpass=f=10000,asplit=2[a][b];'
           f'[a]atrim=0:{overlap},asetpts=PTS-STARTPTS[head];'
           f'[b]atrim={overlap}:{length},asetpts=PTS-STARTPTS[body];'
           f'[body][head]acrossfade=d={overlap}:c1=tri:c2=tri[out]')
    loop=source/'instrumental-loop-before-gain.wav'
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(original),'-filter_complex',graph,
                    '-map','[out]','-ar','44100','-ac','2','-c:a','pcm_f32le',str(loop)],check=True)
    measured=loudness(loop)
    gain=min(-27-measured['integratedLufs'],-5-measured['truePeakDbtp'])
    # Static gain preserves picking dynamics and the loop's level at both ends.
    # Five-millisecond edge tapers suppress MP3 boundary clicks without a pause.
    post=f'volume={gain}dB,afade=t=in:d=0.005,afade=t=out:st={length-overlap-.005}:d=0.005'
    target=source/'music-instrumental-v3.mp3'
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(loop),'-af',post,
                    '-ar','44100','-ac','2','-c:a','libmp3lame','-b:a','192k',str(target)],check=True)
    mastered=media(target)
    report={'file':target.name,'sourceDurationSeconds':duration,
            'durationSeconds':float(mastered['format']['duration']),'crossfadeSeconds':overlap,
            'targetLufs':-27,'loudness':loudness(target),'bytes':target.stat().st_size,
            'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
            'selectedInstrumentalRanges':ranges,'rangeJoinCrossfadeSeconds':join,
            'gainDb':gain,'edgeTaperSeconds':.005,
            'processing':'2.5秒尾首交叉淡化；前置高低切；固定增益保留拨弦强弱；5毫秒边缘平滑；不加合成旋律。',
            'reviewStatus':'mastered-awaiting-instrumental-screen-and-user-listening'}
    if report['loudness']['truePeakDbtp']>-1:raise ValueError('峰值超标')
    # This is a listening aid, not a replacement for the unchanged poem voice.
    narration=args.project.resolve()/'release/narration.wav'
    mix=source/'narration-with-music-preview.mp3'
    voice_duration=float(media(narration)['format']['duration'])
    end=voice_duration+.9
    mix_graph=(f'[1:a]volume=0.45,afade=t=out:st={voice_duration}:d=0.9[bg];'
               f'[0:a][bg]amix=inputs=2:duration=longest:normalize=0,atrim=0:{end},alimiter=limit=0.89:level=false[out]')
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(narration),'-i',str(target),'-filter_complex',mix_graph,
                    '-map','[out]','-ar','44100','-ac','2','-c:a','libmp3lame','-b:a','192k',str(mix)],check=True)
    report['narrationPreview']={'file':mix.name,'poemAudioUnmodified':True,'musicGain':.45,'durationSeconds':end}
    json_write(source/'mastering.json',report)
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__':main()
