# 确认版配乐：燕归花巷

用户已确认王姓试听效果，现已按原定流程推广至本班全部26姓，统一使用同一份16.8秒器乐循环。所有姓氏的诗句、云小朵朗诵、时间轴、图片及互动均未改动。以下首轮筛查与仅王姓范围记录为推广前的制作依据。

## 试听文件

- 正式页面试用文件：`../surname-poetry/public/assets/poems/wang-wuyixiang/music-instrumental-v3.mp3`。
- 配乐叠加现有朗诵：`projects/wang-wuyixiang/source/music-v3-26/narration-with-music-preview.mp3`，只作本地验收，不进入部署目录。
- 配乐循环16.8秒，44.1kHz、双声道、192kbps，约396KiB。片段用于短诗朗诵背景，不能当作完整长篇新作或真人古琴录音。

## 制作与选择依据

先尝试腾讯云TokenHub `minimax-music-v3.0`，收到HTTP 402；没有自动开通新服务或重复提交。改用现有 `minimax-music-v2.6`，只提交了一次成功生成请求。提示词见 `projects/wang-wuyixiang/prompts/music-v3-26.txt`：以自然木质古琴、轻古筝方向编配，温暖、松弛，要求器乐、不写词、不演唱，不使用鼓点或强烈高潮。[腾讯云接口依据](https://cloud.tencent.com/document/product/1823/135323)。

生成原曲约144.8秒，但独立ASR与Silero VAD均提示其中存在疑似人声。整曲未用于正式页面，也没有把接口的 `is_instrumental:true` 当作验收结论。最终只选30.2–49.5秒的器乐间奏，舍弃前奏和疑似演唱部分。原始音轨、失败尝试、筛查差异与未采用版本都留在本地 `source/music-v3*`，不部署。

选段经2.5秒尾首交叉淡化、前置55Hz高通/10kHz低通、固定增益与5毫秒边缘平滑，得到16.8秒循环。使用固定增益保留拨弦强弱，未以动态压缩把所有音符拉成同一力度。实测约-27.27 LUFS、-11.77 dBTP；用户后续要求稍低音量，页面默认音量已从0.45降为0.35，朗诵结束后沿用原有0.9秒淡出。

## 检查与实际限制

- 最终VAD没有检出满足阈值的语音段；独立ASR出现低可信的“字幕by索兰娅”等器乐幻觉，完整结果原样保留，没有声称转写为空。
- 自动检测会漏掉哼唱或误判乐器，不能证明绝无人声，也不能代替用户判断音色、旋律和儿童适用性。自动筛查阶段状态为 `awaiting-user-approval-wang-only`；用户试听确认后，26姓元数据统一为 `approved-by-user`。
- 循环接点最大采样跳变约0.000442，低于0.001，有限数检查通过。音频响度、编码与逐句时间轴检查通过；原有朗诵文件未重新合成。
- 对全部26姓每项素材计算哈希，唯一变化为王姓music；其余25姓素材及王姓朗诵、时间轴、美术均保持不变。记录见 `projects/wang-wuyixiang/source/music-v3/scope-check.json`。
- 运行文件使用新的内容哈希地址，与其他姓氏的v2音乐分开缓存；首轮仅王姓试用时缓存清单为84份；全班统一后恢复83份。HTTP范围播放与长期缓存校验通过，14项回归测试通过。

## 可复现流程

在工作区根目录运行；不会自动发布到云端：

```sh
# 首次会调用生成接口；已有完整响应时复用缓存，不重复计费。
python3 material-workshop/scripts/generate_music_candidate.py material-workshop/projects/wang-wuyixiang --model minimax-music-v2.6 --version music-v3-26
python3 material-workshop/scripts/prepare_music_candidate.py material-workshop/projects/wang-wuyixiang --segments 30.2:49.5
python3 material-workshop/scripts/screen_music_vad.py material-workshop/projects/wang-wuyixiang/source/music-v3-26/music-instrumental-v3.mp3 --out material-workshop/projects/wang-wuyixiang/source/music-v3-26/vad-final.json
```

音频后期需要ffmpeg；VAD使用本机ONNX Runtime与官方Silero模型，模型只放在素材工坊缓存，不进入Docker。后续选段发生变化时必须重新筛查、试听、发布并生成运行时哈希，不得复用旧整曲缓存覆盖当前版本。

## 2026-11-08 用户确认及推广

用户明确确认“现在的配乐ok”。随后将同一内容音轨推广至26姓，重建发布包与内容哈希缓存，所有非音乐素材逐文件哈希保持不变。其他诗句及互动素材是否适合儿童仍按各自验收状态判断，不因音乐通过而自动视为全部内容已验收。
