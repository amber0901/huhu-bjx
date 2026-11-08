# 百家姓

面向幼儿园大班的联网触屏应用：手写姓氏 → HY-Vision识别 → 确认姓氏 → 含姓字的两句古诗、云小朵朗诵和独立互动。

当前覆盖本班26姓，适配横向16:9屏幕。只展示、朗读含姓氏的选句，题目与作者放后面，不追加跟读。王姓采用《乌衣巷》，李姓采用《感遇·江南有丹橘》，马姓已改为《登科后》。26姓共用用户已确认的《燕归花巷》16.8秒古风器乐循环，浏览器只缓存一份音乐。

| 目录 | 用途 | 进入Docker镜像 |
|---|---|---|
| `surname-poetry/` | 应用代码、最终素材、缓存清单及Docker配置 | 是 |
| `material-workshop/` | 素材制作说明、提示词、原稿与工具 | 否 |

素材工坊的原始响应、密钥、生成模型缓存、草稿和发布中间文件不提交Git；已经接入应用的正式素材保存在 `surname-poetry/public/`。Docker构建上下文只包含 `surname-poetry/`，服务器不需要安装素材制作工具，也不需要TTS或音乐生成凭据。

## 腾讯云轻量应用服务器部署

服务器需准备Git、Docker Engine及Docker Compose插件，并配置具有仓库读取权限的GitHub SSH密钥。

```sh
git clone --branch codex/initial-release git@github.com:amber0901/huhu-bjx.git
cd huhu-bjx/surname-poetry
cp .env.example .env
chmod 600 .env
```

编辑服务器 `.env`，至少填写 `TOKENHUB_API_KEY` 与八位以上的 `CLASSROOM_ACCESS_CODE`。默认应用入口端口为8080；识别模型 `hy-vision-2.0-instruct` 与TokenHub地址已在模板中配置。TTS与音乐均使用预先制作好的文件，运行时不再调用生成接口。

```sh
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:8080/api/health
docker compose exec app npm run check:assets
```

在腾讯云防火墙放行配置的入口端口，用一体机浏览器打开 `http://服务器IP:8080/`，由老师输入课堂口令。生产域名、HTTPS及Cookie配置详见 [部署说明](surname-poetry/README.md)。

后续更新：

```sh
cd huhu-bjx/surname-poetry
git pull --ff-only
docker compose up -d --build
```

## 本地开发与验收

应用使用Node.js 22.9+，无第三方npm依赖。在 `surname-poetry/` 中执行 `npm test`、`npm run check:assets` 和 `npm start`；默认入口为 `http://localhost:3000/`。本工作区的现有本地预览使用 `http://127.0.0.1:8899/`，教师素材入口为 `/materials.html`。

- [26姓素材清单](surname-poetry/docs/CLASS_MATERIALS.md)
- [互动复查记录](surname-poetry/docs/INTERACTION_REVIEW.md)
- [界面与缓存说明](surname-poetry/docs/UI_CACHE_REVIEW.md)
- [确认版配乐制作记录](material-workshop/WANG_MUSIC_V3.md)
- [素材制作流程](material-workshop/WORKFLOW.md)

自动测试与素材检查已通过。本机未安装Docker，尚未实际构建镜像或连接腾讯云部署；65寸华为设备的触摸、音量与现场网络仍需实机验证。
