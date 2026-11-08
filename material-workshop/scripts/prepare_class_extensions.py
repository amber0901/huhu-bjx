#!/usr/bin/env python3
"""User-approved classic-poetry extensions and less common literal surname matches."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];base=json.loads((ROOT/'projects/zhou-tingzheng/poem.json').read_text())
rows=[
('徐','xu-dingfengbo','定风波·莫听穿林打叶声','苏轼','宋','莫听穿林打叶声，|何妨吟啸且徐行。','https://zh.wikisource.org/wiki/定風波_(莫聽穿林打葉聲)','宋词','slow-walk','跟随慢慢亮起的脚步走，不比快；徐行就是慢慢走。','a friendly scholar with bamboo walking stick slowly strolling on a leafy path in soft spring rain, rounded green bamboo and pastel sun'),
('陈','chen-zhangfu','送陈章甫','李颀','唐','陈侯立身何坦荡，|虬须虎眉仍大颡。','https://zh.wikisource.org/wiki/送陳章甫','唐诗三百首','portrait-parts','按画像轮廓为陈侯选择弯眉与卷须；关联诗中陈侯外貌，保留生僻字原文，不戏弄人物。','a kind dignified smiling ancient gentleman with broad forehead, softly curled beard and expressive eyebrows, beside a painter desk in green courtyard'),
('邢','xing-chaou','茶中杂咏·茶瓯','皮日休','唐','邢客与越人，|皆能造兹器。','https://zh.wikisource.org/wiki/全唐詩/卷611','全唐诗','pottery-shape','按住陶土转盘把碗慢慢塑圆，松手定型；关联邢地制瓷，取核对版本邢客、兹器。','a charming ancient pottery workshop, creamy white porcelain bowls and celadon bowls, rounded clay wheel, soft green window scenery, no fire'),
('尹','yin-wangxiantai','九日登望仙台呈刘明府','崔曙','唐','关门令尹谁能识，|河上仙翁去不回。','https://zh.wikisource.org/wiki/九日登望仙臺呈劉明府','唐诗三百首','gate-pass','转动图案锁让两半青牛图相合，开启关门；关联令尹关令和古典故事，纯童话联想不当姓氏起源。','a friendly rounded ancient mountain pass gate, a small gentle ox beside an elderly traveler, peach morning clouds and distant jade river, no fantasy combat'),
('贺','he-saiqu','塞下曲·其四','卢纶','唐','野幕敞琼筵，|羌戎贺劳旋。','https://zh.wikisource.org/wiki/和張僕射塞下曲六首','唐诗三百首','drum-rhythm','跟随鼓面一大两小的光圈节奏敲鼓庆贺；关联贺与庆功，不展示战斗和饮酒。','a peaceful outdoor celebratory gathering near a rounded tent with colorful ribbons, small ceremonial drum and friendly smiling people, pastel mountains, no weapons alcohol or battle'),
('肖','xiao-hongqiao','再题文园狮子林十六景·其二·虹桥','弘历','清','石桥湖口长虹肖，|来往都凭镜影中。','https://digitalarchive.npm.gov.tw/Collection/Detail/25415?dep=P','御制诗','bridge-mirror','选择和石桥形状相肖的倒影，感受像与相似；诗中肖读xiào，姓氏肖读xiāo，记录多音差异，不改成萧。','an elegant small rainbow-shaped stone arch bridge over a still garden lake, perfect soft reflection, pastel flowers and rounded garden rocks, peaceful storybook light'),
('廖','liao-minglue','再次韵呈廖明略','黄庭坚','宋','物诚有之士则然，|晚得廖子喜往还。','https://zh.wikisource.org/wiki/山谷集詩注_(四庫全書本)/外集卷06','山谷集诗注','friend-exchange','两位朋友交换卷轴与花枝，分别点亮来与还两条路线；关联廖子往还的友谊。','two friendly ancient scholars happily exchanging a little scroll and flowering branch in a cozy garden, rounded trees, peach sunlight, warm friendship'),
('邓','deng-chenglou','邓州城楼','陈与义','宋','邓州城楼高百尺，|楚岫秦云不相隔。','https://m.cidianwang.com/gushiwen/2/ac4be25912.htm','宋诗','tower-stack','将三层楼从宽到窄叠起来，登楼看云山；邓在邓州地名中。','a friendly tall rounded ancient city tower overlooking distant jade mountains and peach clouds, sunny pastel scenery, welcoming small flags'),
('汪','wang-zengwanglun','赠汪伦','李白','唐','桃花潭水深千尺，|不及汪伦送我情。','https://zh.wikisource.org/wiki/贈汪倫','全唐诗','friendship-depth','慢慢拉下潭水深度绳，最后发现友谊爱心比水更深；关联汪伦送别，不要求识数字。','two friendly travelers waving goodbye across a clear peach blossom pool, tiny wooden boat by bank, smiling faces and falling pink petals, soft spring jade and apricot'),
('刘','liu-xuandu','再游玄都观','刘禹锡','唐','种桃道士归何处？|前度刘郎今又来。','https://zh.wikisource.org/wiki/再遊玄都觀','千家诗','return-trail','刘郎来过的三处脚印先后闪现，记住路线再走回来；关联刘郎今又来，不把桃园画成当时开满桃花。','a cheerful returning scholar at an old quiet garden gateway, soft moss and yellow rapeseed flowers blooming, green trees, warm sun, no pink peach blossoms'),
('洪','hong-canghai','观沧海','曹操','东汉','秋风萧瑟，|洪波涌起。','https://zh.wikisource.org/wiki/觀滄海','乐府诗','wave-sweep','来回划动水面推起三层浪花，观察洪波涌起；不画灾害洪水。','a friendly vast blue jade sea with rounded sparkling waves, little island and soft autumn trees to the right, peach sky, no storm boats in danger or giant scary waves'),
('栗','li-nanlin','南邻','杜甫','唐','锦里先生乌角巾，|园收芋栗未全贫。','https://www.gushiwen.cn/mingju/juv_b684717d1f9a.aspx','全唐诗','harvest-sort','把栗果放入圆形果篮，把叶子留在树上，收满三颗；关联诗中园收芋栗。','a welcoming rural autumn garden, kind man with black cloth headscarf, basket of small chestnuts and tubers, rounded fruit tree, two smiling little children, warm gold jade and peach')]
for surname,id,title,author,dynasty,text,url,collection,game,desc,scene in rows:
 p=copy.deepcopy(base);p.update(id=id,title=title,author=author,dynasty=dynasty,surnames=[surname],lines=text.split('|'),status='draft')
 p.pop('fullPoemLines',None);p.pop('pronunciationChecks',None)
 p['source']={'collection':collection,'url':url,'note':'正文保留姓氏原字；用户已允许必要时扩展经典古诗词。游戏是诗意联想，不作姓氏起源解读。'}
 p['excerpt']={'label':'选句','sourceText':text.replace('|','')}
 p['interaction'].update(game=game,targetSurname=surname,motif=game,backgroundAlt=scene,description=desc);p['interaction'].pop('notes',None)
 if surname=='肖':p['pronunciationNote']='姓氏肖读xiāo；诗句“长虹肖”表示相似，应读xiào。朗诵遵循诗句语境。'
 if surname in ['陈','尹','贺','廖']:p['teacherNote']='姓氏原字约束下，选句较少见且有生僻字，适合先听诗、看图互动，由老师补充解释；不声称幼儿能独立理解全文。'
 project=ROOT/'projects'/id
 for sub in ['prompts','source','release']:(project/sub).mkdir(parents=True,exist_ok=True)
 if (project/'poem.json').exists():continue
 (project/'poem.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
 prompt='Use-case illustration-story. Finished16:9 watercolor Chinese colorful ink picture book background for age5–6. Warm cream rice paper, feathered soft edges, rounded friendly forms, gentle luminous pastel jade peach apricot blue. LEFT58% almost empty pale cream mist for poem text. Narrative subjects on RIGHT40%, blending naturally into cream. Scene: '+scene+'. No text, Chinese characters, signs, logos, UI, border, watermarks. Childlike warm style, no adult harsh brushstrokes.'
 (project/'prompts/background.txt').write_text(prompt+'\n')
print('已准备12个补充选诗项目')
