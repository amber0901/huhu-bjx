# 素材制作与发布流程

当前王姓请按 [WANG_COUPLET_V4.md](WANG_COUPLET_V4.md) 重建：两句选段、云小朵原生慢速、无跟读，使用真实音频对齐。下文中的旧版整诗和统一补静音流程只用于历史样板；脚本已阻止将旧处理误套到第四版王姓成品。通用发布工具仍适用。

## 1. 选诗和核对

本期只制作“李、王”。正文必须包含姓氏的完整文字，作者或标题命中不计入。选诗按明确版本核对；不同版本的诗题、序号与异文记录在项目元数据中。

本轮主样板：张九龄《感遇·江南有丹橘》与刘禹锡《乌衣巷》。王维《送别》保留为更短的备选；选诗依据见 `SELECTION.md`。生成不等于最终质量验收通过。

## 2. 本地服务配置

复制本目录 `.env.example` 为 `.env`，填写 TokenHub API Key 和 TTS 的云 API 凭据。不要将凭据、控制台截图或包含 Authorization 的原始请求放入发布包。

本地生成命令（在本目录运行）：

```sh
python3 scripts/generate_audio.py --check-config
python3 scripts/generate_audio.py projects/wang-wuyixiang --part narration
python3 scripts/generate_audio.py projects/wang-wuyixiang --part guidance
python3 scripts/generate_audio.py projects/wang-wuyixiang --part music
```

“李”的项目路径替换为 `projects/li-ganyu-jiangnan`。已保存的音频会被复用，不会静默覆盖；真实接口失败或超时不会自动重试。若出错，先根据用量、响应或缓存文件核对，再决定后续操作。`--check-config` 只检查有无填写，不显示密钥，也不消耗服务额度。

## 3. 制作图片

按 `prompts/style-guide.md` 和每首诗的背景提示词生成彩色水墨背景。保持横屏 16:9 构图与文字安全区。原图放 `source/`，修改稿放 `drafts/`；验收后放入 `release/background.png`，也可在元数据中改为 `.webp` 或 `.jpg`。本轮最终实际提示词在各项目 `prompts/background-v2.txt`；第一版仍保留供追溯。

## 4. 制作朗诵

从核定诗文生成朗诵，先检查音色，再校对多音字、停顿和朗读速度。保留原始 WAV、合成参数和时间戳响应在 `source/`。本轮使用 101001 女声音色，TTS 语速 -1；后期再做 0.88 倍保调变速，并补足每句之间至少 0.9 秒的停顿。正式音频为 16 kHz 单声道 PCM WAV，避免 MP3 编码延迟影响同步；引导语独立保存为 `release/guidance.wav`。

《感遇》用 SSML 明确指定“绿”为 `lv4`、“重”为 `chong2`，核对原始字幕音素，修正合成服务对“绿林”的默认读音。若改动正文或 SSML，先归档旧音频、原始响应、时间轴和处理记录，再生成；不能继续复用旧时间轴。

把字级时间戳合并成句级时间轴，保存为 `release/timing.json`。`prepare_audio.py` 根据变速前后实测时长比例变换时间戳，并按实际插入的静音帧数增加偏移。若添加诗名、作者介绍或提示语，时间轴必须包含这些片段导致的偏移。时间单位统一为秒，时间从正式朗诵文件的开头计算。没有时间戳时对正式音频做对齐和校准，不能凭平均时长猜测。

生成原始朗诵、引导语和配乐后，运行本地后期（需要 ffmpeg / ffprobe，不调用生成接口）：

```sh
python3 scripts/prepare_audio.py projects/wang-wuyixiang projects/li-ganyu-jiangnan
```

后期始终从 `source/` 的原始音频重建，不能把已经变速的成品再次当作原始音频。两首诗复用同一条引导语“现在轮到你啦，小诗人！看着诗句，慢慢读一遍吧。”。

```json
{
  "unit": "seconds",
  "lines": [
    { "text": "山中相送罢，", "start": 1.2, "end": 3.8 }
  ]
}
```

上例只演示格式，时间不是实际测量值；正式文件必须覆盖元数据中的每一句诗。

## 5. 制作配乐

通过音乐生成服务选择无人声纯音乐模式，配乐方向见每首诗的 `prompts/music.txt`。原始音频放 `source/`，后期处理循环衔接和音量，导出 `release/music.mp3`。本轮从原曲取 64 秒，首尾交叉淡化 3 秒，形成 61 秒循环，目标响度 -28 LUFS；预览中配乐音量默认 0.45。朗诵与音乐保持独立文件，便于在前端控制音量和跟读阶段的播放。

音乐接口可能返回下载 URL、十六进制或 Base64。脚本先缓存响应再解析，失败时复用缓存下载，不盲目重新发起生成；下载 CDN 音频不携带 API Key。

## 6. 发布包验收

把项目的 `poem.json` 复制到 `release/poem.json`，完成图片、朗诵、配乐、时间轴试听后，将副本的 `status` 从 `draft` 改为 `ready`。

发布包至少包含：

```text
release/
├── poem.json
├── background.png
├── narration.wav
├── timing.json
├── music.mp3
└── guidance.wav        可选的独立跟读引导语
```

文件名必须与 `poem.json` 的 `assets` 字段一致。当前工具校验元数据、文件存在与大小、正文命中和时间轴，不代替对图片/音频编码、画面、发音和音画同步的人工验收。

把 `release/poem.json` 标为 `ready` 后，还可运行以下媒体检查，报告保存在各项目的 `source/release-check.json`：

```sh
python3 scripts/check_materials.py projects/wang-wuyixiang projects/li-ganyu-jiangnan
python3 scripts/build_preview.py
node scripts/preview_server.mjs
```

打开 <http://127.0.0.1:8877/> 检查实际播放与逐句亮起、暂停继续、跟读引导。预览通过 HTML 文字层叠加诗文，不把字烘焙进图片；时间取实际音频 `currentTime`。保留截图与检查结论，区分自动检查、浏览器操作检查和 65 寸实机检查。

可选的独立转写检查：在 Apple Silicon Mac 上，用安装了 `mlx-whisper` 和 `opencc-python-reimplemented` 的本地 Python 环境运行 `scripts/verify_audio.py`。该检查不读取密钥、不上传音频，但首次运行会下载所选模型；古诗同音字会造成文字转写差异，不能把原始失败结果改成“完全匹配”。本轮真实结果见 `QA_REPORT.md`。

## 7. 发布到部署项目

在本目录运行：

```sh
python3 scripts/publish_assets.py projects/wang-wuyixiang --check
python3 scripts/publish_assets.py projects/wang-wuyixiang
```

工具只复制 `poem.json` 和明确声明的四项必需资源、可选的引导语到 `../surname-poetry/public/assets/poems/<诗歌ID>/`，同时更新 `../surname-poetry/data/catalog.json`。原图、原始接口响应、提示词和凭据不会被复制。

同一个 ID 已发布时，工具默认停止，避免误覆盖；审核新版本后可加 `--replace`。发布期间不要并行运行多个发布进程或同时手动修改素材目录。

```sh
python3 scripts/publish_assets.py projects/wang-wuyixiang --replace
```

最后进入部署项目运行 `npm run check:assets`，确认通过，再把正式文件提交到 Git。服务器只需拉取代码并重建镜像。
