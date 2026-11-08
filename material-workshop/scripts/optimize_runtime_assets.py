#!/usr/bin/env python3
"""Prepare versioned delivery files; retain approved original media unchanged.
Requires cwebp only on the material-making computer, never in Docker.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile

studio=Path(__file__).resolve().parents[1]
app=studio.parent/'surname-poetry'
public=app/'public'
media=public/'media'
media.mkdir(exist_ok=True)
manifest={'schemaVersion':1,'assets':{}}

def digest(data):return hashlib.sha256(data).hexdigest()
def prepare(source,kind):
    original=source.read_bytes()
    if kind in ['background','companion','home']:
        with tempfile.TemporaryDirectory() as scratch:
            output=Path(scratch)/'asset.webp'
            args=['cwebp','-quiet','-m','6']
            if kind=='companion':args+=['-lossless','-resize','896','0']
            elif kind=='home':args+=['-q','82','-resize','1600','0']
            else:args+=['-q','88']
            subprocess.run(args+[str(source),'-o',str(output)],check=True)
            data=output.read_bytes()
        extension='.webp'
    else:data=original;extension=source.suffix
    sha=digest(data)
    target=media/(sha+extension)
    if not target.exists():target.write_bytes(data)
    return {'url':'/media/'+target.name,'sourceSha256':digest(original),'sha256':sha,'sourceBytes':len(original),'bytes':len(data),'kind':kind}

catalog=json.loads((app/'data/catalog.json').read_text())
for entry in catalog['poems']:
    base=public/'assets/poems'/entry['id']
    poem=json.loads((base/'poem.json').read_text())
    for kind,name in poem['assets'].items():
        source=base/name
        key='/'+str(source.relative_to(public))
        manifest['assets'][key]=prepare(source,kind)
home=studio/'site-assets/home-original.jpg'
manifest['homeBackground']=prepare(home,'home')
manifest['totals']={
    'originalPoemBytes':sum(x['sourceBytes'] for x in manifest['assets'].values()),
    'optimizedPoemBytes':sum(x['bytes'] for x in {x['url']:x for x in manifest['assets'].values()}.values()),
    'homeOriginalBytes':manifest['homeBackground']['sourceBytes'],
    'homeOptimizedBytes':manifest['homeBackground']['bytes'],
}
(app/'data/runtime-assets.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(public/'home-background.css').write_text(':root{--home-photo:url("'+manifest['homeBackground']['url']+'")}\n')
# Content addresses are immutable. Prune only generated files no longer referenced.
keep={x['url'].split('/')[-1] for x in manifest['assets'].values()}|{manifest['homeBackground']['url'].split('/')[-1]}
for item in media.iterdir():
    if item.is_file() and item.name not in keep:item.unlink()
print(json.dumps(manifest['totals'],ensure_ascii=False,indent=2))
