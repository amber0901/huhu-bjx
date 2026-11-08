#!/usr/bin/env python3
"""Promote complete class materials after media validation; leave incomplete work untouched."""
import json,shutil,argparse
from pathlib import Path
from check_materials import inspect
from publish_assets import publish
ROOT=Path(__file__).resolve().parents[1]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--publish',action='store_true');args=parser.parse_args();count=0
 for f in sorted((ROOT/'projects').glob('*/poem.json')):
  p=json.loads(f.read_text());project=f.parent
  if p.get('interactionMode')!='surname-poem-play' or p.get('status')=='archived':continue
  draft=project/'drafts/couplet-v4/child-403000';background=project/'source/background.png'
  if not all(x.exists() for x in [background,draft/'narration.wav',draft/'timing.json']):continue
  release=project/'release';release.mkdir(exist_ok=True);p['status']='ready';p['reviewStatus']='generated-and-technical-checks-passed-awaiting-user-review'
  music_name=p['assets']['music']
  for source,name in [(background,'background.png'),(draft/'narration.wav','narration.wav'),(draft/'timing.json','timing.json'),(ROOT/'projects/wang-wuyixiang/release'/music_name,music_name)]:shutil.copy2(source,release/name)
  if p.get('assets',{}).get('companion'):shutil.copy2(project/'source'/p['assets']['companion'],release/p['assets']['companion'])
  (release/'poem.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
  inspect(project)
  if args.publish:publish(release,ROOT.parent/'surname-poetry',replace=True)
  count+=1;print(p['surnames'][0]+': '+p['title']+' 素材检查通过'+('，已接入' if args.publish else ''),flush=True)
 print('本轮完成',count)
if __name__=='__main__':main()
