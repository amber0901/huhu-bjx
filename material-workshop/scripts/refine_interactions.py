#!/usr/bin/env python3
"""Sync reviewed interaction descriptions; never modifies paintings or audio."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
revision=json.loads((ROOT/'batches/class-2026-11/interaction-revision.json').read_text())
for file in (ROOT/'projects').glob('*/poem.json'):
 poem=json.loads(file.read_text());game=poem.get('interaction',{}).get('game')
 if poem.get('interactionMode')!='surname-poem-play' or poem.get('status')=='archived':continue
 poem['interactionVersion']=max(poem.get('interactionVersion',0),revision['version'])
 if game in revision['games']:poem['interaction']['description']=revision['games'][game]
 for dest in [file,file.parent/'release/poem.json',ROOT.parent/'surname-poetry/public/assets/poems'/poem['id']/'poem.json']:
  if dest.exists():
   value=json.loads(dest.read_text());value['interactionVersion']=poem['interactionVersion'];value['interaction']=poem['interaction'];dest.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
print('已同步24个姓氏互动说明，绘画与朗诵文件未改动')
