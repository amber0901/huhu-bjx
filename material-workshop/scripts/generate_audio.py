#!/usr/bin/env python3
"""Generate real Tencent TTS/music files; never prints credentials or fabricates timing."""

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener
from urllib.parse import urlsplit
import uuid
import wave

STUDIO = Path(__file__).resolve().parents[1]
HOST = "tts.tencentcloudapi.com"
HAN = re.compile(r"[\u3400-\u9fff]")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise RuntimeError("接口发生重定向，已停止，未向新地址转发凭据")


def config():
    values = {}
    file = STUDIO / ".env"
    if file.exists():
        for raw in file.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[7:]
            key, separator, value = line.partition("=")
            if separator:
                values[key.strip()] = value.strip().strip('"').strip("'")
    for key in ["TOKENHUB_API_KEY", "TOKENHUB_BASE_URL", "MUSIC_MODEL", "TENCENTCLOUD_SECRET_ID", "TENCENTCLOUD_SECRET_KEY", "TENCENTCLOUD_TOKEN", "TTS_VOICE_TYPE", "TTS_SPEED", "TTS_SAMPLE_RATE", "TTS_ENABLE_SUBTITLE"]:
        if os.environ.get(key):
            values[key] = os.environ[key]
    return values


def require_keys(values, keys):
    missing = [key for key in keys if not values.get(key)]
    if missing:
        raise ValueError("请先在 material-workshop/.env 填写：" + "、".join(missing))


def json_write(file, value):
    file.parent.mkdir(parents=True, exist_ok=True)
    temporary = file.with_name(file.name + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(file)


def post(url, payload, headers, timeout):
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    request = Request(url, data=body, headers=headers, method="POST")
    try:
        with build_opener(NoRedirect()).open(request, timeout=timeout) as response:
            return json.load(response)
    except HTTPError as error:
        # 不输出请求对象、Authorization 或服务端可能回显的完整响应。
        code = ""
        try:
            detail = json.loads(error.read())
            code = str(detail.get("Response", {}).get("Error", {}).get("Code", ""))
        except (ValueError, AttributeError):
            pass
        safe_code = re.sub(r"[^A-Za-z0-9_.-]", "", code)[:80]
        raise RuntimeError(f"HTTP {error.code} {safe_code}；已停止，不自动重试可能收费的生成请求") from None
    except (URLError, TimeoutError):
        raise RuntimeError("网络或超时错误；生成状态可能不确定，请核对用量后再决定重试") from None


def tts(values, text):
    require_keys(values, ["TENCENTCLOUD_SECRET_ID", "TENCENTCLOUD_SECRET_KEY"])
    payload = {
        "Text": text, "SessionId": str(uuid.uuid4()), "ModelType": 1,
        "VoiceType": int(values.get("TTS_VOICE_TYPE", "101001")),
        "Speed": float(values.get("TTS_SPEED", "-1")), "Volume": 0,
        "SampleRate": int(values.get("TTS_SAMPLE_RATE", "16000")),
        "Codec": "wav", "EnableSubtitle": values.get("TTS_ENABLE_SUBTITLE", "true").lower() == "true",
    }
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    timestamp = int(time.time())
    date = datetime.fromtimestamp(timestamp, timezone.utc).strftime("%Y-%m-%d")
    scope = f"{date}/tts/tc3_request"
    content_type = "application/json; charset=utf-8"
    canonical_headers = f"content-type:{content_type}\nhost:{HOST}\n"
    signed = "content-type;host"
    canonical = "\n".join(["POST", "/", "", canonical_headers, signed, hashlib.sha256(body).hexdigest()])
    to_sign = "\n".join(["TC3-HMAC-SHA256", str(timestamp), scope, hashlib.sha256(canonical.encode()).hexdigest()])
    def sign(key, message):
        return hmac.new(key, message.encode(), hashlib.sha256).digest()
    date_key = sign(("TC3" + values["TENCENTCLOUD_SECRET_KEY"]).encode(), date)
    signing_key = sign(sign(date_key, "tts"), "tc3_request")
    signature = hmac.new(signing_key, to_sign.encode(), hashlib.sha256).hexdigest()
    authorization = f"TC3-HMAC-SHA256 Credential={values['TENCENTCLOUD_SECRET_ID']}/{scope}, SignedHeaders={signed}, Signature={signature}"
    headers = {"Content-Type": content_type, "Host": HOST, "Authorization": authorization, "X-TC-Action": "TextToVoice", "X-TC-Version": "2019-08-23", "X-TC-Timestamp": str(timestamp)}
    if values.get("TENCENTCLOUD_TOKEN"):
        headers["X-TC-Token"] = values["TENCENTCLOUD_TOKEN"]
    result = post("https://" + HOST + "/", payload, headers, 60).get("Response", {})
    if "Error" in result:
        code = re.sub(r"[^A-Za-z0-9_.-]", "", str(result["Error"].get("Code", "unknown")))[:80]
        raise RuntimeError("TTS 返回错误：" + code)
    audio = base64.b64decode(result.get("Audio", ""), validate=True)
    if not audio.startswith(b"RIFF") or audio[8:12] != b"WAVE":
        raise ValueError("TTS 没有返回可识别的 WAV 音频")
    return audio, {"requestId": result.get("RequestId"), "subtitles": result.get("Subtitles", []), "settings": {key: value for key, value in payload.items() if key != "SessionId"}}


def line_timing(lines, subtitles, duration):
    characters = []
    for item in subtitles:
        text = "".join(HAN.findall(item.get("Text", "")))
        if text:
            begin, end = item["BeginTime"] / 1000, item["EndTime"] / 1000
            characters.extend((character, begin, end) for character in text)
    expected = "".join("".join(HAN.findall(line)) for line in lines)
    actual = "".join(item[0] for item in characters)
    if actual != expected:
        raise ValueError("合成时间戳与正文不一致；音频已保存，未编造时间轴，需要校准")
    offset, previous, result = 0, 0.0, []
    for line in lines:
        length = len(HAN.findall(line))
        segment = characters[offset:offset + length]
        start, end = min(item[1] for item in segment), max(item[2] for item in segment)
        if start < previous or end <= start or end > duration + 0.05:
            raise ValueError("时间戳存在重叠或超出音频；需要校准后再发布")
        result.append({"text": line, "start": round(start, 3), "end": round(end, 3)})
        offset += length
        previous = end
    return {"unit": "seconds", "lines": result}


def generate_tts(project, poem, values, part):
    source, release = project / "source", project / "release"
    target = release / poem["assets"][part]
    response_file = source / (part + "-tts-response.json")
    text = poem.get("narrationSsml", "".join(poem["lines"])) if part == "narration" else poem["guidanceText"]
    # 音频和原始时间戳均存在时复用；缺少任一项则不盲目重复生成。
    if target.exists():
        if not response_file.exists():
            raise ValueError(f"{target.name} 已存在但没有原始响应，请先人工核对")
        metadata = json.loads(response_file.read_text(encoding="utf-8"))
        if metadata.get("settings", {}).get("Text") != text:
            raise ValueError(f"{target.name} 的原稿已修改；请先归档旧音频和响应，再生成新版本")
        print(f"{poem['id']}: 复用 {target.name}", flush=True)
    else:
        print(f"{poem['id']}: 正在生成 {part}", flush=True)
        audio, metadata = tts(values, text)
        source.mkdir(parents=True, exist_ok=True)
        release.mkdir(parents=True, exist_ok=True)
        source_audio = source / target.name
        source_audio.write_bytes(audio)
        target.write_bytes(audio)
        json_write(response_file, metadata)
    if part == "narration":
        processing_file = source / "audio-processing.json"
        if processing_file.exists():
            processed = json.loads(processing_file.read_text(encoding="utf-8")).get("narration", {})
            timing_file = release / poem["assets"]["timing"]
            if processed.get("sha256") == hashlib.sha256(target.read_bytes()).hexdigest() and timing_file.exists() and processed.get("timingSha256") == hashlib.sha256(timing_file.read_bytes()).hexdigest():
                print(f"{poem['id']}: 保留已后期处理的音频和对应时间轴", flush=True)
                return
            raise ValueError("后期处理记录与当前文件不一致，请重新运行 prepare_audio.py")
        with wave.open(str(target), "rb") as audio:
            duration = audio.getnframes() / audio.getframerate()
        timing = line_timing(poem["lines"], metadata["subtitles"], duration)
        json_write(release / poem["assets"]["timing"], timing)
        print(f"{poem['id']}: 朗诵 {duration:.2f} 秒，已保存真实逐句时间轴", flush=True)


def generate_music(project, poem, values):
    if poem.get('musicProduction',{}).get('method')=='tokenhub-instrumental-excerpt':
        raise ValueError('当前音乐为已筛查的器乐选段；请使用独立候选生成流程，不得复用旧整曲缓存')
    if poem.get('musicProduction',{}).get('method')=='original-plucked-string-synthesis':
        raise ValueError('当前采用原创拨弦纯器乐，请运行 scripts/compose_instrumental.py；禁止复用旧音乐接口缓存')
    require_keys(values, ["TOKENHUB_API_KEY"])
    base = values.get("TOKENHUB_BASE_URL", "https://tokenhub.tencentmaas.com/v1").rstrip("/")
    if base != "https://tokenhub.tencentmaas.com/v1":
        raise ValueError("本脚本只向已核对的腾讯云国内站 TokenHub 发送凭据")
    target = project / "release" / poem["assets"]["music"]
    if target.exists():
        print(f"{poem['id']}: 已有 music.mp3，保留并跳过生成", flush=True)
        return
    payload = {"model": values.get("MUSIC_MODEL", "minimax-music-v2.6"), "prompt": (project / "prompts/music.txt").read_text(encoding="utf-8").strip(), "is_instrumental": True, "lyrics_optimizer": False, "output_format": "hex", "audio_setting": {"sample_rate": 44100, "bitrate": 256000, "format": "mp3"}}
    print(f"{poem['id']}: 正在生成无人声配乐，完成后保存实际音频", flush=True)
    source = project / "source"
    source.mkdir(parents=True, exist_ok=True)
    cached = source / "music-full-response.json"
    if cached.exists():
        response = json.loads(cached.read_text(encoding="utf-8"))
        print(f"{poem['id']}: 使用已保存的音乐生成结果，不重新提交", flush=True)
    else:
        response = post(base + "/wand/minimax-music/generation", payload, {"Content-Type": "application/json", "Authorization": "Bearer " + values["TOKENHUB_API_KEY"]}, 300)
        json_write(cached, response)
    metadata = {key: value for key, value in response.items() if key != "data"}
    metadata["data"] = {"status": response.get("data", {}).get("status")}
    metadata["settings"] = payload
    json_write(source / "music-response.json", metadata)
    if response.get("base_resp", {}).get("status_code", 0) != 0:
        raise RuntimeError("音乐生成失败，状态码：" + str(response["base_resp"]["status_code"]))
    if response.get("data", {}).get("status") != 2:
        raise RuntimeError("音乐尚未完成；保留任务状态后核对，不自动重复提交")
    encoded = response.get("data", {}).get("audio", "")
    if not isinstance(encoded, str):
        raise ValueError("音乐音频字段类型异常，原始结果已保存")
    if encoded.startswith("https://"):
        url = urlsplit(encoded)
        if url.username or url.password or not url.hostname or not url.hostname.endswith((".myqcloud.com", ".tencentcos.cn", ".minimax.io", ".minimaxi.com")):
            raise ValueError("音乐下载地址不属于已核对的服务 CDN，原始结果已保存")
        # 下载生成音频时不携带 TokenHub Authorization。
        try:
            with build_opener(NoRedirect()).open(Request(encoded), timeout=60) as response_stream:
                audio = response_stream.read(32 * 1024 * 1024 + 1)
        except (HTTPError, URLError, TimeoutError):
            raise RuntimeError("音乐下载失败；生成结果已缓存，再运行将重试下载而非重新生成") from None
        if len(audio) > 32 * 1024 * 1024:
            raise ValueError("音乐文件超出本地样板的大小限制")
    elif encoded.startswith("data:audio/"):
        audio = base64.b64decode(encoded.split(",", 1)[1], validate=True)
    elif re.fullmatch(r"[0-9a-fA-F]+", encoded):
        audio = bytes.fromhex(encoded)
    else:
        audio = base64.b64decode(encoded, validate=True)
    if not audio:
        raise ValueError("音乐接口未返回音频")
    target.parent.mkdir(parents=True, exist_ok=True)
    (source / "music-raw-v1.mp3").write_bytes(audio)
    target.write_bytes(audio)
    print(f"{poem['id']}: 配乐已保存；仍需试听、检查响度与循环衔接", flush=True)


def main():
    parser = argparse.ArgumentParser(description="生成并保存真实朗诵、引导语、时间轴和纯音乐；默认不覆盖已有音频。")
    parser.add_argument("projects", type=Path, nargs="*")
    parser.add_argument("--part", choices=["narration", "guidance", "music", "all"], default="all")
    parser.add_argument("--check-config", action="store_true", help="只检查配置，不调用服务、不显示密钥")
    args = parser.parse_args()
    values = config()
    try:
        keys = []
        if args.part in ["music", "all"]:
            keys.append("TOKENHUB_API_KEY")
        if args.part in ["narration", "guidance", "all"]:
            keys += ["TENCENTCLOUD_SECRET_ID", "TENCENTCLOUD_SECRET_KEY"]
        require_keys(values, keys)
        if args.check_config:
            print("配置项已填写；此检查不代表接口调用成功。")
            return 0
        if not args.projects:
            raise ValueError("请指定至少一个素材项目目录")
        for directory in args.projects:
            project = directory.resolve()
            if not project.is_relative_to(STUDIO / "projects"):
                raise ValueError("素材项目必须位于 material-workshop/projects 内")
            poem = json.loads((project / "poem.json").read_text(encoding="utf-8"))
            if poem.get('materialVersion',2)>=4 and args.part!='music':
                raise ValueError('第四版选段不使用旧版整诗/跟读合成入口，请运行 scripts/generate_wang_couplet.py')
            (project / "release").mkdir(parents=True, exist_ok=True)
            for part in (["narration", "guidance", "music"] if args.part == "all" else [args.part]):
                if part == "music":
                    generate_music(project, poem, values)
                else:
                    generate_tts(project, poem, values, part)
            # 生成不等于验收；始终保持 draft，试听后再明确标记 ready。
            json_write(project / "release/poem.json", {**poem, "status": "draft"})
    except (ValueError, RuntimeError, OSError, KeyError, TypeError) as error:
        message = str(error)
        for key in ["TOKENHUB_API_KEY", "TENCENTCLOUD_SECRET_ID", "TENCENTCLOUD_SECRET_KEY", "TENCENTCLOUD_TOKEN"]:
            if values.get(key):
                message = message.replace(values[key], "[已隐藏]")
        print("生成停止：" + message, file=sys.stderr, flush=True)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
