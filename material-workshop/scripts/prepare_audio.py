#!/usr/bin/env python3
"""Prepare teaching-speed narration and a gentle loop from preserved source audio."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import wave

from generate_audio import json_write, line_timing


def run(arguments):
    result = subprocess.run(arguments, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError("音频处理失败：" + result.stderr[-1600:])
    return result


def duration(file):
    result = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(file)])
    return float(json.loads(result.stdout)["format"]["duration"])


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def prepare_speech(project, poem):
    source, release = project / "source", project / "release"
    original = source / "narration.wav"
    response = json.loads((source / "narration-tts-response.json").read_text())
    with wave.open(str(original), "rb") as audio:
        original_duration = audio.getnframes() / audio.getframerate()
    raw_timing = line_timing(poem["lines"], response["subtitles"], original_duration)
    paced = source / "narration-paced-v2.wav"
    run(["ffmpeg", "-v", "error", "-y", "-i", str(original), "-af", "atempo=0.88,loudnorm=I=-18:TP=-2:LRA=7", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(paced)])
    with wave.open(str(paced), "rb") as audio:
        parameters = audio.getparams()
        sample_rate = audio.getframerate()
        frame_width = audio.getnchannels() * audio.getsampwidth()
        frames = audio.readframes(audio.getnframes())
        paced_duration = audio.getnframes() / sample_rate
    ratio = paced_duration / original_duration
    lead_frames = round(0.45 * sample_rate)
    chunks = [b"\0" * (lead_frames * frame_width)]
    shift_frames, cursor = lead_frames, 0
    timing = []
    for index, item in enumerate(raw_timing["lines"]):
        if index:
            previous = raw_timing["lines"][index - 1]
            boundary = round((previous["end"] + item["start"]) / 2 * ratio * sample_rate)
            chunks.append(frames[cursor * frame_width:boundary * frame_width])
            cursor = boundary
            original_gap = (item["start"] - previous["end"]) * ratio
            extra_frames = max(0, round((0.9 - original_gap) * sample_rate))
            chunks.append(b"\0" * (extra_frames * frame_width))
            shift_frames += extra_frames
        timing.append({"text": item["text"], "start": round(item["start"] * ratio + shift_frames / sample_rate, 3), "end": round(item["end"] * ratio + shift_frames / sample_rate, 3)})
    chunks.append(frames[cursor * frame_width:])
    chunks.append(b"\0" * round(0.45 * sample_rate) * frame_width)
    target = release / poem["assets"]["narration"]
    with wave.open(str(target), "wb") as audio:
        audio.setparams(parameters)
        audio.writeframes(b"".join(chunks))
    timing_file = release / poem["assets"]["timing"]
    json_write(timing_file, {"unit": "seconds", "source": "腾讯云字级时间戳，经实际音频变速与插入静音同步变换", "processing": {"atempo": 0.88, "measuredDurationRatio": ratio, "minimumLineGapSeconds": 0.9, "leadingSilenceSeconds": 0.45}, "lines": timing})
    guidance = release / poem["assets"]["guidance"]
    run(["ffmpeg", "-v", "error", "-y", "-i", str(source / "guidance.wav"), "-af", "atempo=0.94,loudnorm=I=-18:TP=-2:LRA=7,afade=t=in:d=0.06", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(guidance)])
    return {"narration": {"duration": duration(target), "sha256": digest(target), "timingSha256": digest(timing_file)}, "guidance": {"duration": duration(guidance), "sha256": digest(guidance)}}


def prepare_music(project, poem):
    if poem.get('musicProduction',{}).get('method')=='tokenhub-instrumental-excerpt':
        raise ValueError('当前音乐为独立审核的器乐选段，禁止从历史整曲重建；使用 prepare_music_candidate.py')
    if poem.get('musicProduction',{}).get('method')=='original-plucked-string-synthesis':
        raise ValueError('当前纯器乐由 compose_instrumental.py 制作，不能再从旧音乐源文件重建')
    source, release = project / "source", project / "release"
    original = source / "music-raw-v1.mp3"
    length = min(64.0, duration(original))
    overlap = min(3.0, length / 5)
    if length < 10:
        raise ValueError("配乐过短，不能制作合适的背景循环")
    # 先播放主体，结尾与原片头交叉淡化；终点接回主体的起点。
    graph = f"[0:a]atrim=0:{length},asetpts=PTS-STARTPTS,asplit=2[a][b];[a]atrim=0:{overlap},asetpts=PTS-STARTPTS[head];[b]atrim={overlap}:{length},asetpts=PTS-STARTPTS[body];[body][head]acrossfade=d={overlap}:c1=tri:c2=tri,loudnorm=I=-28:TP=-5:LRA=7[out]"
    target = release / poem["assets"]["music"]
    run(["ffmpeg", "-v", "error", "-y", "-i", str(original), "-filter_complex", graph, "-map", "[out]", "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k", str(target)])
    return {"duration": duration(target), "sha256": digest(target), "crossfadeSeconds": overlap, "targetLufs": -28}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("projects", type=Path, nargs="+")
    parser.add_argument("--speech-only", action="store_true")
    args = parser.parse_args()
    try:
        for directory in args.projects:
            project = directory.resolve()
            poem = json.loads((project / "poem.json").read_text())
            if poem.get('materialVersion',2)>=4:
                raise ValueError('第四版使用原生童声和真实对齐，不适用旧版变速补静音；请按 WANG_COUPLET_V4.md 重建')
            report = prepare_speech(project, poem)
            if not args.speech_only:
                report["music"] = prepare_music(project, poem)
            json_write(project / "source/audio-processing.json", report)
            print(f"{poem['id']}: 朗诵{report['narration']['duration']:.2f}秒，引导语{report['guidance']['duration']:.2f}秒" + (f"，配乐{report['music']['duration']:.2f}秒" if "music" in report else ""), flush=True)
    except (OSError, ValueError, RuntimeError, KeyError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
