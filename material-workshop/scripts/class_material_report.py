#!/usr/bin/env python3
"""Write a reviewable inventory from published assets, never from proposed choices."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];APP=ROOT.parent/'surname-poetry'
planfile=ROOT/'batches/class-2026-11/plan.json';plan=json.loads(planfile.read_text())
poems={}
for e in json.loads((APP/'data/catalog.json').read_text())['poems']:
 p=json.loads((APP/'public/assets/poems'/e['id']/'poem.json').read_text());poems[p['surnames'][0]]=p
lines=['# 本班26姓氏素材清单','', '24个新增姓氏已经生成并接入项目；李、王的诗句与朗诵沿用已验收版本。王姓新版配乐已获用户确认并同步至26姓；其余新增内容仍待用户逐项试听、体验验收。','', '统一云小朵（403000），原生语速 -0.65；只朗读正文选句，不读题目、作者，不追加跟读。26姓共用用户已确认的16.8秒模型生成器乐间奏循环，缓存仅下载一份。原图由内置 imagegen 逐图生成，提示词见各项目 prompts/background.txt；源文件和音频制作记录在各项目 source/、drafts/，最终运行资源在 surname-poetry/public/。','', '| 姓氏 | 诗词与作者 | 展示、朗读选句 | 独立互动 |','|---|---|---|---|']
for s in plan['roster']:
 p=poems[s];lines.append(f"| {s} | 《{p['title']}》{p['dynasty']}·{p['author']} | {' / '.join(p['lines'])} | {p['interaction'].get('description','送燕归家')} |")
 for item in plan['items']:
  if item['surname']==s:
   item.update(status='approved-existing' if s in ['李','王'] else 'generated-integrated-awaiting-user-review',projectId=p['id'],title=p['title'],author=p['author'],lines=p['lines'],interactionConcept=p['interaction'].get('description','送燕归家'),sourceStatus='verified-selected-body',source=p['source']);item.pop('candidateTitle',None)
   item['musicStatus']=p.get('musicReviewStatus','existing-v2-awaiting-classwide-revision')
lines+=['','少见姓氏说明：陈、尹、贺、廖选句有生僻字，需要老师结合画面解释；没有为了耳熟能详而修改古诗原文或冒用标题、作者中的姓氏。肖保留原字，诗中表示相似读xiào，姓氏读xiāo。邢采用核对版本“邢客与越人，皆能造兹器”，不混用其他版本措辞。','', '《听筝》“周郎”联系听曲；《过故人庄》郭为城郭；《南邻》栗为果实。互动用诗意或字义联想，不将其包装为姓氏起源。','', '实际时间轴来自本地 Whisper DTW 对齐与波形静音边界校正，没有等分音频；独立转写原始差异保存在项目内，童声古诗有较多同音字误识，未宣称转写文字全部准确或已通过人工听感验收。']
(ROOT/'batches/class-2026-11/MATERIALS.md').write_text('\n'.join(lines)+'\n');plan['status']='all24-generated-and-integrated-awaiting-user-review';planfile.write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
(APP/'docs/CLASS_MATERIALS.md').write_text('\n'.join(lines[:3]+['','查看本地 /materials.html 可逐项试听、查看出处并打开互动。','']+lines[6:])+'\n')
print('已从实际发布目录生成26姓氏清单')
