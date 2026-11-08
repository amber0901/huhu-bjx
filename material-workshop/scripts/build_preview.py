#!/usr/bin/env python3
"""Build an isolated local review bundle; never copies .env or source responses."""
import json
from pathlib import Path
import shutil

STUDIO=Path(__file__).resolve().parents[1]
preview=STUDIO/'preview'
result=[]
for identifier in ['wang-wuyixiang','li-ganyu-jiangnan']:
    project=STUDIO/'projects'/identifier
    poem=json.loads((project/'poem.json').read_text())
    release=project/'release'
    if not all((release/name).is_file() for name in poem['assets'].values()):
        release=STUDIO.parent/'surname-poetry/public/assets/poems'/identifier
        published=json.loads((release/'poem.json').read_text())
        if any(published.get(key)!=poem.get(key) for key in ['id','title','lines','surnames','assets','guidanceText','narrationSsml','followAlong','interactionMode','interactionVersion','interaction']):
            raise ValueError(f'正式素材与制作稿不一致：{identifier}')
        poem=published
    timing=json.loads((release/poem['assets']['timing']).read_text())
    destination=preview/'assets'/identifier
    destination.mkdir(parents=True,exist_ok=True)
    urls={}
    for kind,name in poem['assets'].items():
        if '/' in name or '\\' in name or name.startswith('.'):
            raise ValueError('素材文件名无效')
        source=release/name
        if not source.is_file():
            raise ValueError(f'素材缺失：{identifier}/{name}')
        shutil.copy2(source,destination/name)
        urls[kind]=f'assets/{identifier}/{name}'
    item={k:poem[k] for k in ['id','title','author','dynasty','lines','surnames']}|{'assets':urls,'timing':timing}
    for key in ['materialVersion','excerpt','voice','followAlong','interactionMode','interactionVersion','interaction']:
        if key in poem:item[key]=poem[key]
    # Unapproved Wang voice auditions are local review assets; never publish them here.
    audition_root=project/'drafts/voice-review-v3'
    if identifier=='wang-wuyixiang' and poem.get('materialVersion',2)<4 and audition_root.exists():
        variants=[]
        for voice_id in ['teacher-403005','soft-402001','child-403000']:
            folder=audition_root/voice_id
            if not all((folder/name).is_file() for name in ['production.json','narration.wav','guidance.wav','timing.json','alignment-check.json']):
                raise ValueError(f'试听样本尚未完成：{voice_id}')
            production=json.loads((folder/'production.json').read_text())
            alignment=json.loads((folder/'alignment-check.json').read_text())
            audition_timing=json.loads((folder/'timing.json').read_text())
            target=destination/'review-v3'/voice_id
            target.mkdir(parents=True,exist_ok=True)
            updated_urls={**urls}
            for kind,name in [('narration','narration.wav'),('guidance','guidance.wav'),('timing','timing.json')]:
                shutil.copy2(folder/name,target/name)
                updated_urls[kind]=f'assets/{identifier}/review-v3/{voice_id}/{name}'
            variants.append({'voiceId':voice_id,'name':production['voice']['name'],'description':production['voice']['description'],'durationSeconds':production['files']['narration']['durationSeconds'],'lineGapsSeconds':alignment['lineGapsSeconds'],'assets':updated_urls,'timing':audition_timing})
        previous={'assets':dict(urls),'timing':timing}
        selected=variants[0]
        item.update(assets=selected['assets'],timing=selected['timing'])
        item['voiceReview']={'status':'awaiting-user-review','revision':3,'selectedVoiceId':selected['voiceId'],'voices':variants,'previous':previous}
    result.append(item)
(preview/'materials.json').write_text(json.dumps({'poems':result},ensure_ascii=False,indent=2)+'\n')
print('本地素材预览已构建：'+str(preview))
