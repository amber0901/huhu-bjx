# 素材工作目录

本目录供本地制作使用，不进入应用镜像，也无需在腾讯云服务器安装这里的工具。

用户已确认王姓模型生成器乐间奏循环 `music-instrumental-v3.mp3`，当前已同步至全部26姓。64秒合成琴弦v2只保留为本地历史版本。当前制作、选段与检查依据见 `WANG_MUSIC_V3.md`；合成琴弦v2与更早歌声问题的历史记录见 `INSTRUMENTAL_MUSIC.md`。

- `projects/<诗歌ID>/poem.json`：待审核的选诗及资源文件名。
- `projects/<诗歌ID>/prompts/`：这首诗的背景图、朗诵与配乐制作要求。
- `projects/<诗歌ID>/source/`：生成服务的原始下载文件和时间戳响应，默认不提交 Git。
- `projects/<诗歌ID>/drafts/`：图片、音频修改稿，默认不提交 Git。
- `projects/<诗歌ID>/release/`：审核通过的最终发布包，默认不提交 Git。发布后的正式文件在部署目录中提交。
- `scripts/publish_assets.py`：校验最终发布包，并复制到部署项目中。
- `WORKFLOW.md`：完整制作和发布流程。

王姓《乌衣巷》后两句的云小朵童声与水墨素材已获用户确认，朗诵约 5.27 秒，无跟读。互动先点出诗句里的“王”，再根据页眉和诗句中的姓字匹配同字门牌，重玩更换门牌位置；画面不显示左下角提示、浮动印章或燕子字牌。规则与检查见 `WANG_SURNAME_GAME.md`，语音美术记录见 `WANG_COUPLET_V4.md`，进度见 `SAMPLE_STATUS.json`。

李姓《感遇·江南有丹橘》已改为只展示、朗读最后一联，沿用云小朵与相同语速。独立互动为“木、子拼成李”，完成后出现小橘子与落叶；不采用王姓门牌玩法。记录见 `LI_COUPLET_V4.md`。历史选诗依据在 `SELECTION.md`，第二版检查在 `QA_REPORT.md`，第三版试音在 `WANG_VOICE_REVIEW.md`；历史整诗、跟读和旧音色不代表当前素材。

## 打开素材预览

在本目录运行：

```sh
python3 scripts/build_preview.py
node scripts/preview_server.mjs
```

打开 <http://127.0.0.1:8877/>，点诗句里的“王”，再点或拖到“王”字小屋；“看看我的姓”会亮起页眉和诗句中的姓字，“再玩一次”重置并更换门牌位置。配乐和进度在“老师设置”中。`build_preview.py` 可从部署目录中的正式素材恢复，服务器不需要素材生成密钥。

李姓预览：<http://127.0.0.1:8877/?surname=li>。点诗中“李”开启拼字；“木”放上面、“子”放下面，支持拖动和点按。“看看我的姓”亮起姓字和未填的部件位置，不代替孩子完成。页面右上角可切换两姓。

## 制作工具

生成接口脚本使用 Python 3 标准库；音频后期和检查需要 `ffmpeg`、`ffprobe`。独立本地语音转写检查使用 macOS Apple Silicon 上的可选 `.venv-qa` 环境（MLX Whisper、OpenCC），无需部署到腾讯云。原始响应、试音、修改前的音频和制作模型缓存留在本地忽略目录。

`generate_audio.py` 使用本目录 `.env` 中的腾讯云凭据；已保存的素材会复用，原稿变化时会停止，避免误用旧音频。不要直接删除文件反复调用生成接口。音频后期、预览构建和发布均不调用收费接口。

## 本班新增24姓

本次已为截图确认的24个新姓氏完成背景、云小朵两句朗诵、逐句时间轴及独立互动接入。清单和选诗出处见 `batches/class-2026-11/MATERIALS.md`。统一验收使用 <http://127.0.0.1:8899/materials.html>；8877为早期李、王历史样板，未同步本班新增素材。制作流程：prepare_class_batch.py / prepare_class_extensions.py → 内置 imagegen 逐图生成并归档 → generate_selected_couplet.py → align_wang_voice_review.py → release_class_batch.py --publish → optimize_runtime_assets.py → 部署项目 npm run check:assets。后续不重复调用已缓存的付费语音结果。

互动说明修订使用 `scripts/refine_interactions.py` 同步项目与已发布元数据；本轮只调整界面互动，不重新调用素材生成服务。复查记录见 `batches/class-2026-11/INTERACTION_REVIEW.md`。
