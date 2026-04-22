# TopoClaw

与手机端打通的电脑端聊天客户端。支持输入 IMEI 或扫码绑定，与手机共享同一套聊天记录。

## 功能

- **绑定方式**：输入 IMEI / 扫码绑定（PC 生成二维码，手机扫一扫扫描）
- **聊天**：发送消息、接收 AI 回复，与手机端打通
- **无执行功能**：PC 端仅做聊天，不执行屏幕操作

## 开发

日常开发命令可在 **Windows PowerShell** 下执行；桌面打包建议在 **Windows CMD** 下执行（路径：`TopoDesktop/`）。

```powershell
npm install
```

### 内置服务资源（首次克隆或更新子模块后必做）

桌面端会内置两套后端，需同步源码并安装到 `resources/python-embed`：

| 脚本 | 作用 |
|------|------|
| `npm run setup:assistant` | 将仓库内 `TopoClaw/topoclaw`（兼容旧 `nanobot`）同步到 `resources/TopoClaw` |
| `npm run setup:group-manager` | 将仓库根目录 `GroupManager/` 同步到 `resources/group-manager`（SimpleChat，非 nanobot） |
| `npm run setup:python` | 下载/校验内嵌 Python，并 `pip install` TopoClaw 与 group-manager 的依赖 |

一键执行上述三步（推荐）：

```powershell
npm run setup:builtin
```

### 启动开发环境

```powershell
npm run electron:dev
```

说明：`electron:dev` **不会**自动跑 `setup:builtin`；若缺少 `resources/TopoClaw`、`resources/group-manager` 或未装依赖，请先执行 `npm run setup:builtin`。

仅 Web 开发（不启 Electron、不依赖内嵌 Python）：

```powershell
npm run dev
```

## 打包（Windows CMD，二选一）

### 路径 A：一键脚本（推荐）

```cmd
build-desktop-core-plus-browser.cmd
```

### 路径 B：手动分步（与脚本等价）

```cmd
npm install
npm run setup:assistant
npm run setup:group-manager
npm run setup:python:core
cd resources\TopoClaw
..\python-embed\python.exe -m pip install browser-use==0.12.0 --no-deps --prefer-binary
cd ..\..
npm run round-icon
npm run licenses:generate
npx tsc -p tsconfig.electron.json
npx vite build
npx electron-builder --config electron-builder.config.cjs
```

产物在 `release/` 目录。

## 图标

- 应用图标：`apk5/Image_20251124184821.png`，复制到 `public/icon.png`
- 小助手头像：与端侧 drawable 一致，位于 `public/avatars/`（ic_assistant_avatar.png、ic_skill_learning_avatar.png、ic_customer_service_avatar.png）

## 服务器

默认从本地 `TopoDesktop/.env.local` 读取 `VITE_MOBILE_AGENT_BASE_URL`

## 内置资源说明（已合并 `resources/*/README.md`）

### `resources/TopoClaw`

内置 `topoclaw` 运行时资源。通过 `npm run setup:assistant` 从仓库源码同步到该目录，供桌面端内嵌 Python 环境调用。

### `resources/group-manager`

内置 SimpleChat Assistant（纯 LLM 问答小助手）资源，支持：

- `WebSocket /ws` 流式聊天（`{type:"chat", thread_id, message, images?}`）
- `GET /health` 健康检查
- `GET /api/version` 版本信息

典型启动（示例）：

```bash
cd Assistants/SimpleChatAssistant
pip install -r requirements.txt
python main.py --port 8320 --api-key sk-xxx
```

需配置 `OPENAI_API_KEY`（可通过 `.env` 或启动参数传入）。

### `resources/python-embed`

用于存放 Windows Python Embeddable Package，支持桌面端执行能力。

- 推荐直接执行 `npm run setup:python` 自动下载/校验/安装依赖
- 打包时会将该目录复制进安装包 `resources`
- 手动安装时需确保目录下存在 `python.exe`、`python3xx._pth`、`Lib/` 等核心文件
