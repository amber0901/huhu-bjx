# 王姓第四版：两句童声与小燕子素材

配乐修正：用户报告旧配乐含歌声，现已替换为 64 秒原创五声音阶拨弦纯器乐 `music-instrumental-v2.mp3`。本页有关旧配乐文件名和旧音乐验收的记录为历史信息，最新流程见 [INSTRUMENTAL_MUSIC.md](INSTRUMENTAL_MUSIC.md)。

后续更新：本页语音和美术已获用户确认。互动已改为“认姓—同字门牌”配对，并精简浮动文字，最新规则和检查见 [WANG_SURNAME_GAME.md](WANG_SURNAME_GAME.md)；下文原先直接送燕子回家的玩法为历史说明。

用户已选定「小伙伴 · 云小朵」。本轮只优化王姓：略慢、少文字、无跟读；李姓未扩展。成品已放入部署素材目录，本地预览为 <http://127.0.0.1:8877/>。轻互动目前用于素材体验，正式手写识别界面仍待后续集成。

## 显示与朗诵

画面按以下顺序排版，诗句字体最大，题目和作者较小：

> 旧时王谢堂前燕，
> 飞入寻常百姓家。
>
> 乌衣巷
>
> 唐 · 刘禹锡

这是原诗第三、四句，共十四字。元数据通过 `excerpt` 标记选句，完整四句留在 `fullPoemLines` 供核对，前端不展示全文。正文仍包含“王”，不靠作者或题目匹配姓氏。

声音只朗读上述两句，不读题目、作者，不播放跟读邀请。`followAlong=false`，正式包不再包含 `guidance.wav`，页面也没有引导语播放器、跟读状态或朗读任务。

云小朵音色 ID 403000，采样率 24 kHz、单声道 PCM WAV。合成服务原生 Speed 从前次 -0.25 调至 -0.65，整段一次生成；逗号后保留 300 ms 的附加停顿指令。只做恒定音量增益，没有后期变速、变调或切句补静音。最终音频 5.271 秒，实际句间静音约 0.556 秒，峰值 -2.0 dBTP。设置值与实际静音时长不是同一个量，停顿按实际波形核对。[腾讯云接口文档](https://cloud.tencent.com/document/api/1073/37995)

此音色未返回字级字幕。时间轴使用本地 MLX Whisper 跨注意力 DTW 对齐，并根据实际波形校准首句开始、句间停顿和末句结束；记录包含音频 SHA-256，不用文字长度等分时长。另做不提供原文提示的独立转写，结果为“就食王谢堂前宴，飞入寻常百姓家”，存在同音异字，未声称严格文字识别全部通过。

## 适合本轮体验的两个小动作

1. **点姓字**：诗句里的“王”颜色更醒目；点它会出现一个小“王”印记和柔和花瓣，并播放两句诗。把自己的姓与诗句中的字联系起来。
2. **送小燕子回家**：拖动燕子到小屋，或点一下燕子、点“送燕子回家”，都能让它沿画面飞回家。将动作对应到诗句中的“燕”“飞入”“家”，并提供短促的视觉回应。

两个动作没有强制顺序，没有倒计时、积分排名或失败惩罚。拖动未到小屋时可以重试；点按是较简单的替代操作。“再玩一次”重置印记、位置和音频。所有反馈都是视觉变化，没有增加口播；不录音、不判断孩子是否朗读。音量和进度收进“老师设置”，避免主画面出现大量操作文字。诗句仍可随真实朗诵进度逐句亮起。

这些是基于短提示、单步动作、大触摸区域的设计判断，并非已经完成儿童课堂效果研究。65 寸华为一体机的实际触摸、扬声器和观看距离尚未验证。

## 图片素材

原有儿童绘本水墨背景沿用，实际 1672×941。新增一只独立、透明背景的同画风燕子伙伴，实际 1254×1254 PNG，alpha 实测范围 0–255，可由前端单独移动。

使用内置 **imagegen** 生成，以现有背景为画风参考。提示词保存在 `projects/wang-wuyixiang/prompts/swallow-buddy-v4.txt`；源图在 `source/swallow-buddy-v4.png`，正式图为 `release/swallow-buddy.png`。没有把字体或按钮烘焙到图片里，保留透明通道。

## 已完成的检查

- 正式包六个文件：`poem.json`、`background.png`、`narration.wav`、`timing.json`、`music.mp3`、`swallow-buddy.png`。
- 选句文字、正文姓氏命中、音频编码、峰值、时间轴顺序和边界检查通过，`npm run check:assets` 通过。
- 在 1920×1080 浏览器中检查了两句在前、题目作者在后，以及默认窄屏布局。
- 实际操作通过：点“王”播放、暂停继续、结束后无跟读、配乐淡出；拖动回家、点按回家、重玩。
- 浏览器检查未记录 console error / warn；截图为 `preview/screenshots/wang-couplet-v4.jpg`、`wang-couplet-home-v4.jpg`。
- 原有背景、配乐与李姓发布素材的 SHA-256 保持不变。历史王姓完整第二版包保存在 `source/previous-release-v2/`，第三版试音继续保留。

## 重建

```sh
python3 scripts/generate_wang_couplet.py
HF_HOME="$PWD/.cache/huggingface" .venv-qa/bin/python scripts/align_wang_voice_review.py \
  --draft-root projects/wang-wuyixiang/drafts/couplet-v4 \
  --poem-file projects/wang-wuyixiang/drafts/couplet-v4/child-403000/poem.json \
  --narration-only
```

生成脚本复用已保存的原始响应，不重复调用服务。将配套 `narration.wav`、`timing.json` 和透明燕子图整理到 `release/` 后，运行媒体检查、`publish_assets.py --replace` 和 `build_preview.py`。原始响应、草稿和本地模型不进入 Docker；正式包只包含运行时素材。旧的 `prepare_audio.py` 已阻止对第四版执行减速、补静音处理。
