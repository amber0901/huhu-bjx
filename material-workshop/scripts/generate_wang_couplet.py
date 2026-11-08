#!/usr/bin/env python3
"""Create only the requested two-line excerpt, in the selected child's voice."""
import json
from generate_audio import STUDIO, config, json_write, tts
from generate_wang_voice_review import normalize_gain

project = STUDIO/'projects/wang-wuyixiang'
source = project/'source/couplet-v4'
draft = project/'drafts/couplet-v4/child-403000'
source.mkdir(parents=True,exist_ok=True)
draft.mkdir(parents=True,exist_ok=True)
poem = json.loads((project/'poem.json').read_text())
poem['fullPoemLines'] = poem.get('fullPoemLines',poem['lines'])
poem['lines'] = ['旧时王谢堂前燕，','飞入寻常百姓家。']
poem['excerpt'] = {'lineNumbers':[3,4], 'label':'选句'}
poem['materialVersion'] = 4
poem['interactionMode'] = 'surname-home-match'
poem['interactionVersion'] = 5
poem['interaction'] = {'targetSurname':'王','homeChoices':['王','李','张'],'requireSurnameDiscovery':True,'randomizeHomes':True,'spokenFeedback':False}
poem['readingOrder'] = ['lines','title','author']
poem['voice'] = {'id':403000,'name':'小伙伴 · 云小朵','speed':-.65,'sampleRate':24000}
poem['followAlong'] = False
poem.pop('guidanceText',None)
poem.pop('narrationSsml',None)
poem['assets'].pop('guidance',None)
poem['pronunciationChecks'] = {'王':'wang2','燕':'yan4'}
poem['source']['note'] = '仅展示、朗读原诗第三、四句；完整原诗保存在 fullPoemLines 供出处核对。题目和作者位于诗句之后，不参与朗诵；不播放跟读引导。'
text = '<speak>旧时王谢堂前燕，<break time="300ms"/>飞入寻常百姓家。</speak>'
values = {**config(),'TTS_VOICE_TYPE':'403000','TTS_SPEED':'-0.65','TTS_SAMPLE_RATE':'24000','TTS_ENABLE_SUBTITLE':'true'}
audio_file,response_file = source/'narration.wav',source/'response.json'
if audio_file.exists() or response_file.exists():
    if not audio_file.exists() or not response_file.exists():raise ValueError('先核对已有调用状态，未重复生成')
    response=json.loads(response_file.read_text())
    if response['settings']['Text']!=text or response['settings']['Speed']!=-.65:raise ValueError('已有参数不同，先归档')
    print('复用已生成的两句童声朗诵。',flush=True)
else:
    print('生成两句选段，云小朵，Speed=-0.65。',flush=True)
    audio,response=tts(values,text)
    audio_file.write_bytes(audio)
    json_write(response_file,response)
production={'status':'sample-ready','voice':poem['voice'],'generation':{'speed':-.65,'previousSpeed':-.25,'sampleRate':24000,'extraCommaBreakMs':300,'nativeProsody':True},'files':{'narration':normalize_gain(audio_file,draft/'narration.wav')}}
production['files']['narration']['providerSubtitleCount']=len(response['subtitles'])
json_write(draft/'production.json',production)
json_write(draft/'poem.json',poem)
print('两句选段已保存：'+str(draft),flush=True)
print('时长：'+str(round(production['files']['narration']['durationSeconds'],3))+' 秒；无跟读语音。',flush=True)
