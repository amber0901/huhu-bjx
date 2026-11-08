#!/usr/bin/env python3
"""Prepare verified excerpt metadata. Does not call paid services."""
import json,copy,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
base=json.loads((ROOT/'projects/zhou-tingzheng/poem.json').read_text())
# Exact selected body text; source URLs were checked against original public-domain texts.
rows=[
('文','wen-songzizhou','送梓州李使君','王维','文翁翻教授，|不敢倚先贤。','送梓州李使君','book-flip','翻动三页书，让文翁学堂的文字逐页亮起；关联文、教授。','a friendly ancient village school, an open picture book, bamboo desk and soft green trees'),
('何','he-huixiang','回乡偶书','贺知章','儿童相见不相识，|笑问客从何处来。','回鄉偶書_(少小離家老大回)','footprint-path','沿亮起的脚印找来路，让归乡老人和孩子相见；关联何处。','two smiling small children greeting a kind elderly traveler near a little bridge and willow tree'),
('张','zhang-lushan','庐山谣寄卢侍御虚舟','李白','庐山秀出南斗傍，|屏风九叠云锦张。','廬山謠寄盧侍御虛舟','cloud-unfold','向外拉开云帘，展开九叠青山画屏；关联张开与云锦张。','layered rounded Lushan blue green mountains wrapped in pastel rainbow clouds like an unfolding silk screen'),
('江','jiang-jiande','宿建德江','孟浩然','野旷天低树，|江清月近人。','宿建德江','moon-reflection','滑动月影，与江面月亮轮廓重合；关联江水与近人的月。','a clear jade river at gentle twilight, a full moon, distant low trees and a tiny wooden boat, luminous rather than dark'),
('翁','weng-jiangxue','江雪','柳宗元','孤舟蓑笠翁，|独钓寒江雪。','江雪','fishing-timing','鱼漂轻轻下沉时点钓竿，观察后收竿；关联翁与独钓。','a kindly elderly fisherman with straw cape and bamboo hat on a tiny boat, warm pastel snowy river, soft rounded snowy mountains, gentle comforting snow'),
('朱','zhu-wuyixiang','乌衣巷','刘禹锡','朱雀桥边野草花，|乌衣巷口夕阳斜。','烏衣巷','flower-color','选朱红颜料给桥边三朵小花上色；朱字有红色义，是字义联想，不宣称朱雀桥因花得名。','a small old stone bridge with wildflowers in sunset, peach pink apricot light, little swallows far away, welcoming Jiangnan lane'),
('雷','lei-xiyu','无题·飒飒东风细雨来','李商隐','飒飒东风细雨来，|芙蓉塘外有轻雷。','無題_(颯颯東風細雨來)','weather-hold','长按小云朵积蓄细雨，荷花慢慢展开；关联雷雨，不播放惊吓雷声。','a soft lotus pond with pink lotus buds and tender round leaves, light spring rain, small fluffy bluish cloud, absolutely no dramatic storm'),
('马','ma-dengkehou','登科后','孟郊','春风得意马蹄疾，|一日看尽长安花。','登科後','horse-flowers','带小马去看长安花，任意顺序拖到花旁或点花前进，三处花逐一开放。','a kind Tang scholar riding a real gentle chestnut horse on a spring flower path near Changan, soft peach blossoms and colorful wildflowers'),
('于','yu-shudao','蜀道难','李白','蜀道之难，|难于上青天！','蜀道難_(李白)','cloud-steps','按由低到高的云阶向上跳；关联于字所在的上青天句意，不冒充姓氏字源。','rounded high green mountains with a gentle winding path ascending to pale blue sky, soft cotton clouds, no cliffs or danger'),
('郭','guo-guren','过故人庄','孟浩然','绿树村边合，|青山郭外斜。','過故人莊','outside-wall','选择城郭外的山影，点亮郭外青山；区分内外，关联郭与城郭。','a tiny friendly village enclosed by a low rounded ancient wall, green trees inside, blue green mountains visibly outside, mellow sunny countryside'),
('吴','wu-furong','芙蓉楼送辛渐','王昌龄','寒雨连江夜入吴，|平明送客楚山孤。','芙蓉樓送辛漸','lantern-route','用小灯照亮从夜色到清晨的水路，送友人小船出发；吴是诗里的地域，不宣称姓氏起源。','a riverside Chinese pavilion in light dawn rain, pale apricot sunrise on blue river, little departing boat, rounded distant mountains, friendly not melancholy'),
]
for surname,id,title,author,verse,url,game,description,scene in rows:
 p=copy.deepcopy(base);p.update(id=id,title=title,author=author,surnames=[surname],lines=verse.split('|'),status='draft')
 p.pop('fullPoemLines',None);p.pop('pronunciationChecks',None)
 p['excerpt']={'label':'选句','sourceText':verse.replace('|','')}
 p['source'].update(url='https://zh.wikisource.org/wiki/'+url,note='原文选句含姓氏原字；只展示朗读选句。互动为诗意/字义联想，不作为姓氏起源说明。')
 if id=='ma-dengkehou':
  p['source']['collection']='全唐诗·卷374';p['assets']['companion']='horse.png';p['excerpt']['lineNumbers']=[3,4]
 p['interaction'].update(game=game,targetSurname=surname,motif=game,backgroundAlt=scene,description=description)
 p['interaction'].pop('notes',None)
 project=ROOT/'projects'/id
 for sub in ['prompts','source','release']: (project/sub).mkdir(parents=True,exist_ok=True)
 if (project/'poem.json').exists():continue
 (project/'poem.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
 prompt='Use-case: illustration-story. Create a finished 16:9 landscape background for a Chinese poetry touchscreen for children aged 5–6. Soft colorful ink-and-watercolor picture-book illustration on warm rice paper. Rounded friendly forms, feathered soft brushwork, luminous pastel jade/peach/apricot/blue, no harsh adult calligraphy strokes. Reserve LEFT 58% as very light cream mist with minimal texture for legible poem text. All narrative subjects on RIGHT 40%, upper right and edges; lower right can support an interactive overlay. Scene: '+scene+'. Natural seamless watercolor transitions, warm and gentle and age-appropriate. No writing, Chinese characters, logo, watermark, UI, signs, borders, speech bubbles, or printed words. Wide 16:9, not a collage.'
 (project/'prompts/background.txt').write_text(prompt+'\n')
print('已准备',len(rows),'个选句项目与逐图提示词')
