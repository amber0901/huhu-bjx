# 马 · 登科后（替换版）

只展示、朗读：

> 春风得意马蹄疾，
> 一日看尽长安花。

题目《登科后》与“唐 · 孟郊”置于后面，不读题目作者，不引导跟读。[核对原文](https://zh.wikisource.org/wiki/登科後)。全唐诗卷374，属于用户允许的经典诗词扩展。全诗仅保存在资料字段，不在幼儿页面显示。以春风骑马赏花联想诗意，不作姓氏起源说明。

互动：先点诗中“马”，再拖小马到花旁，也能点花让它走过去。三处花可任意顺序开放，无计时、竞速或记忆路线；灯泡示范手势、点亮未开放花，不代操作。重复看同一处不重复累计，重玩恢复。

## 制作记录

- 图像使用内置 imagegen 模式。完整最终提示词为 `prompts/background.txt`、`prompts/horse.txt`；原图 `source/background.png`、`source/horse.png`。小马PNG实际含透明通道，运行时转透明WebP。图像生成后未进行脚本重绘或背景移除。
- 朗诵：腾讯云云小朵403000、原生语速-0.65、24000Hz；同一请求读两句，标点停顿加300毫秒SSML控制。归一化只调整固定增益，无变速拼接。成品6.083792秒，句间波形停顿约0.642秒。
- 逐句同步使用本地Whisper DTW与实际静音边界，不等分时间。`drafts/couplet-v4/child-403000/`保存制作、对齐和独立转写；独立转写有“马提吉/看近”等差异，未宣称逐字识别或人工听感全部通过，供用户试听验收。
- 沿用已确认的64秒原创五声音阶合成拨弦纯音乐，无人声采样。
- `release/`为校验后的发布包；运行文件已接入 `surname-poetry/public/assets/poems/ma-dengkehou/`，浏览器实际使用 `/media/` 内容哈希资源。旧版本退出当前目录，历史素材留在 ma-changgan，批量发布会跳过 archived 项目。

## 发布体积（字节）

| 文件 | 原文件 | 运行文件 |
|---|---:|---:|
| background.png | 2,040,535 | 125,500 |
| narration.wav | 292,100 | 292,100 |
| timing.json | 495 | 495 |
| music-instrumental-v2.mp3 | 1,537,296 | 1,537,296 |
| horse.png | 2,114,893 | 296,774 |

更改素材后依次执行 check_materials.py、publish_assets.py、optimize_runtime_assets.py，再执行部署项目 npm run check:assets。只在本机制作端运行这些脚本；Docker使用已发布文件。
