#!/usr/bin/env python3
"""One cached TokenHub instrumental request, isolated from approved releases."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
from urllib.request import Request, build_opener

from generate_audio import config, require_keys, post, json_write, NoRedirect


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('project', type=Path)
    parser.add_argument('--model', default='minimax-music-v3.0', choices=['minimax-music-v3.0','minimax-music-v2.6'])
    parser.add_argument('--version', default='music-v3')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9-]+', args.version):
        raise ValueError('无效的版本目录')
    project = args.project.resolve()
    source = project / 'source' / args.version
    source.mkdir(parents=True, exist_ok=True)
    prompt = (project / 'prompts' / (args.version + '.txt')).read_text().strip()
    if not 1 <= len(prompt) <= 2000:
        raise ValueError('提示词应为1–2000字符')
    payload = {'model':args.model,'prompt':prompt,'is_instrumental':True,'lyrics_optimizer':False,
               'output_format':'hex','audio_setting':{'sample_rate':44100,'bitrate':256000,'format':'mp3'}}
    cached, request_file = source / 'response.json', source / 'request.json'
    if cached.exists():
        response = json.loads(cached.read_text())
        if json.loads(request_file.read_text())['payload'] != payload:
            raise ValueError('已缓存请求参数不同，请保留旧记录并使用新的版本名')
    else:
        if request_file.exists():
            raise RuntimeError('已有提交记录但没有完整响应；先核对服务端用量，不重复可能计费的请求')
        values = config()
        require_keys(values, ['TOKENHUB_API_KEY'])
        base = values.get('TOKENHUB_BASE_URL','https://tokenhub.tencentmaas.com/v1').rstrip('/')
        if base != 'https://tokenhub.tencentmaas.com/v1':
            raise ValueError('只使用用户已配置的腾讯云TokenHub地址')
        json_write(request_file, {'payload':payload,'status':'submitted-no-automatic-retry'})
        print('正在生成独立器乐样板：'+args.model, flush=True)
        try:
            response = post(base+'/wand/minimax-music/generation', payload,
                            {'Authorization':'Bearer '+values['TOKENHUB_API_KEY'],'Content-Type':'application/json'},600)
        except RuntimeError as error:
            json_write(source/'submission-error.json', {'error':str(error),'automaticRetry':False})
            raise
        json_write(cached, response)
    status = response.get('base_resp',{}).get('status_code',0)
    if status != 0:
        raise RuntimeError('生成失败，状态码：'+str(status)+'；未重复提交')
    if response.get('data',{}).get('status') != 2:
        raise RuntimeError('响应不是已完成状态；已保留记录，不重复提交')
    encoded = response.get('data',{}).get('audio','')
    if not isinstance(encoded,str):
        raise ValueError('音频响应格式不符；已保存记录')
    if encoded.startswith('https://'):
        url=urlsplit(encoded)
        if url.username or url.password or not url.hostname or not url.hostname.endswith(('.myqcloud.com','.tencentcos.cn','.minimax.io','.minimaxi.com')):
            raise ValueError('生成音频下载地址不属于服务CDN')
        # No API authorization is forwarded to the generated audio CDN.
        with build_opener(NoRedirect()).open(Request(encoded),timeout=90) as stream:
            audio=stream.read(40*1024*1024+1)
    elif re.fullmatch(r'[0-9a-fA-F]+',encoded):
        audio=bytes.fromhex(encoded)
    elif encoded.startswith('data:audio/'):
        audio=base64.b64decode(encoded.split(',',1)[1],validate=True)
    else:
        raise ValueError('音频响应格式不符；已保存记录')
    if not audio or len(audio)>40*1024*1024:
        raise ValueError('音频大小异常')
    target = source/'generated-original.mp3'
    target.write_bytes(audio)
    json_write(source/'generation.json', {'provider':'Tencent TokenHub','model':args.model,
        'parameters':payload,'extraInfo':response.get('extra_info',{}),'bytes':len(audio),
        'sha256':hashlib.sha256(audio).hexdigest(),'status':'generated-awaiting-vocal-screen-and-listening',
        'documentation':'https://cloud.tencent.com/document/product/1823/135323'})
    print('已保存生成音频：'+str(target), flush=True)


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError,ValueError) as error:
        print(str(error),file=sys.stderr)
        sys.exit(1)
