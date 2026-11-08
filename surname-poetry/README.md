# 百家姓：触屏应用与 Docker 部署

本目录可单独上传 Git，作为独立 Docker 构建上下文。不依赖同级素材制作目录。当前覆盖本班26个姓氏：手写姓氏 → 云端识别 → 孩子确认 → 两句诗与朗诵 → 各姓独立互动 → 返回写字。

王姓为《乌衣巷》后两句、送燕归家；李姓为《感遇·江南有丹橘》最后一联、木子拼李。沿用儿童水墨图、云小朵音色与语速和逐句时间轴；26姓共用用户已确认的《燕归花巷》器乐循环；不追加跟读。每姓目前一首，增加素材后同姓会随机选取。新增24姓的选句、出处与独立互动见 `docs/CLASS_MATERIALS.md`；老师可打开 `/materials.html` 逐项试听与体验。

本轮已将儿童操作改为图标，移除右上角姓氏标签，并接入用户照片作为柔化首页背景。压缩、缓存与最新验证见 [docs/UI_CACHE_REVIEW.md](docs/UI_CACHE_REVIEW.md)。

## 本地体验

要求 Node.js 22.9+。服务端无第三方运行依赖，已提交打包后的浏览器文件，部署时无需 npm install。

```sh
cp .env.example .env
# 在 .env 填写 TOKENHUB_API_KEY，其他识别参数已有默认值。
npm run check:assets
npm test
npm start
```

打开 <http://localhost:3000/>。开发中可指定 `PORT=8899 HOST=127.0.0.1 npm start`，当前本地完整应用在 <http://127.0.0.1:8899/>。原 8877 是素材预览，不提供手写识别。

`npm run setup` 可在本地生成随机课堂口令并写入 `.env`，不输出口令；已有非空口令保留。配置变动后重启服务。开发环境可不设口令；生产环境必须至少八位。

## 腾讯云轻量应用服务器

服务器准备 Docker Engine、Docker Compose 插件与 Git，拉取仓库后进入本目录。若整个工作区作为仓库，路径为 `<仓库>/surname-poetry`；若本目录单独作为仓库，直接进入仓库根目录。

```sh
git clone --branch codex/initial-release git@github.com:amber0901/huhu-bjx.git
cd huhu-bjx/surname-poetry
cp .env.example .env
chmod 600 .env
```

编辑服务器 `.env`，填写以下值，密钥和课堂口令均不提交 Git：

| 配置 | 用途 |
| --- | --- |
| `TOKENHUB_API_KEY` | 已开通 HY-Vision 的 TokenHub Key |
| `CLASSROOM_ACCESS_CODE` | 自定至少八位口令，只由老师在设备上输入 |
| `APP_PORT` | 默认 8080；按服务器实际入口调整 |
| `SECURE_COOKIES` | 直接 HTTP 体验为 false；配置 HTTPS 后设为 true |
| `RECOGNITION_DAILY_LIMIT` | 默认 300 次／进程／UTC 日；重启清零，不是账单硬限额 |

默认模型地址为 `https://tokenhub.tencentmaas.com/v1`，模型为 `hy-vision-2.0-instruct`。运行时只需要识别 Key，不需要腾讯云 TTS SecretId、SecretKey 或音乐服务凭据。

```sh
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:8080/api/health
docker compose exec app npm run check:assets
```

在轻量应用服务器防火墙放行选定的入口端口，用一体机浏览器打开 `http://服务器IP:8080/`。老师输入课堂口令后进入写字页。会话持续 12 小时，服务重启后需要重新打开课堂。

正式课堂入口建议使用域名和 HTTPS；反向代理需保留原始 Host，指向应用端口。设置 `SECURE_COOKIES=true` 后必须通过 HTTPS 访问，否则浏览器不会携带会话 Cookie。已有域名、证书或网关时复用现有方案。部署前尚需根据实际服务器确认系统、Docker 状态、域名与入口配置。

容器使用 Node 22 Alpine、非 root 用户、只读文件系统，无需数据库或写入卷。正式图片、音频和时间轴直接进入镜像。`.dockerignore` 仅允许应用代码、最终素材和素材检查脚本，不包含 `.env`、测试截图或 `material-workshop/`。

## 使用与异常处理

- 手指、触控笔、鼠标均可书写；支持撤一笔、重写。手写图片以白底裁切为 512×512，只发送笔迹，不发送界面或题目。
- 模型读取实际汉字，不将结果强行限制到已收录的26个姓氏。孩子先确认识别结果；未收录姓氏进入“诗词还在路上”页面。
- 空白或过小笔迹在本地提示；不清楚的结果鼓励重写。网络失败可保留笔迹重试，识别途中可取消，迟到结果不会覆盖新操作。
- 点击诗中姓字或喇叭播放两句，朗诵结束后才显示互动，并用小手示范第一步。暂停时互动保持隐藏；重播会暂时收起，重玩清空进度。页面内切换保持同一个顶层文档，便于全屏体验；返回写字时移除诗词页并停止音频。
- 图片只在请求内存中处理；本服务不写入笔迹、儿童姓名或原始模型响应到磁盘或日志。云端请求依腾讯云账户服务设置处理。
- 每 IP 每分钟 8 次识别，最多 2 个并发，模型超时 30 秒。课堂口令连续错误 5 次后暂缓一分钟。反向代理后多个设备可能共用该 IP 限制；本期按单台一体机使用。
- 安全防护包括同源请求、HttpOnly／SameSite 会话、图片格式和体积限制、错误脱敏。不要把 Key 写入前端文件或 URL。

## 验证与更新

```sh
npm test
npm run check:assets
# 服务器上更新：
git pull --ff-only
docker compose up -d --build
```

服务端测试使用受控模型响应验证权限、限流、错误和 API 逻辑；真实识别与浏览器体验记录另见 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。当前没有在本机实际构建 Docker 镜像，本机未安装 Docker；服务器部署和 65 寸华为设备触控、音量、网络环境仍待实测。

增加姓氏时，先在素材制作目录完成审核并发布到 `public/assets/poems/` 和 `data/catalog.json`；再为该姓增加与诗句相连的独立互动。不要只复制门牌或拼字玩法。媒体无需在课堂现场生成。

新增素材后须在制作电脑运行 `python3 material-workshop/scripts/optimize_runtime_assets.py`（工作区根目录），提交生成的 `public/media/`、`public/home-background.css` 与 `data/runtime-assets.json`。课堂端采用 WebP 图片、共享配乐、内容版本地址与长期缓存；HTTPS 或 localhost 另启用本机持久素材缓存。识别请求和笔迹不缓存。

接口：`GET /api/health`、`GET /api/config`（不含密钥）、`GET /api/catalog`（`?brief=1`为精简名册）、`GET /api/poem?id=...`（单首含时间轴）、`GET /api/materials`（含时间轴）、`GET /api/cache-manifest`、`POST /api/session`、`POST /api/recognize`。识别请求为 `{ "image": "data:image/png;base64,..." }`；响应为 `recognized + surname + supported` 或 `unclear`。

加载优化、按需缓存与较低配乐音量见 [docs/LOADING_REVIEW.md](docs/LOADING_REVIEW.md)。前端源码修改后，在开发电脑执行 `npm ci`、`npm run build`，并提交 `public/build/` 与更新后的HTML；Docker只使用生成文件，不安装打包工具。素材检查会核对源码与打包文件，防止漏打包。

互动第9版在朗诵结束后展示场景任务，统一小手示范与单一灯泡提示；26姓逐项复查、玩法关联和试用关注点见 `docs/INTERACTION_REVIEW.md`。
