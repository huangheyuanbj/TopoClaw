# TopoClaw

A desktop chat client that syncs with the mobile app. Supports binding via IMEI input or QR code scanning, sharing the same chat history with the mobile side.

## Features

- **Binding**: IMEI input / QR code binding (PC generates the QR code, phone scans it)
- **Chat**: Send messages, receive AI replies, synced with the mobile side
- **No execution**: The PC side only handles chat — it does not perform screen operations

## Development

All commands run in **Windows PowerShell** (path: `TopoDesktop/`).

```powershell
npm install
```

### Built-in Service Resources (required after first clone or submodule update)

The desktop client ships with two built-in backends. Sync the source code and install them into `resources/python-embed`:

| Script | Purpose |
|--------|---------|
| `npm run setup:assistant` | Sync `TopoClaw/topoclaw` (backward-compatible with legacy `nanobot`) to `resources/TopoClaw` |
| `npm run setup:group-manager` | Sync the repo-root `GroupManager/` to `resources/group-manager` (SimpleChat, not nanobot) |
| `npm run setup:python` | Download/verify the embedded Python and `pip install` dependencies for both backends |

Run all three in one step (recommended):

```powershell
npm run setup:builtin
```

### Starting the Dev Environment

```powershell
npm run electron:dev
```

Note: `electron:dev` does **not** run `setup:builtin` automatically. If `resources/TopoClaw`, `resources/group-manager`, or their dependencies are missing, run `npm run setup:builtin` first.

Web-only development (no Electron, no embedded Python):

```powershell
npm run dev
```

## Packaging

```powershell
npm run electron:build
```

The equivalent pipeline (matching `build` in `package.json`) runs sequentially:

1. `setup:assistant` — sync TopoClaw
2. `setup:group-manager` — sync group-manager
3. `setup:python` — embed Python + install both backend dependencies
4. `round-icon` — icon processing
5. `tsc -p tsconfig.electron.json` — compile the Electron main process
6. `vite build` — build the renderer
7. `electron-builder` — produce the installer

Output goes to the `release/` directory.

Portable builds and similar scripts that differ only in `electron-builder` flags (e.g. `build:portable`) also include `setup:assistant`, `setup:group-manager`, and `setup:python`.

## Icons

- App icon: `apk5/Image_20251124184821.png`, copied to `public/icon.png`
- Assistant avatars: Matching the mobile-side drawables, located at `public/avatars/` (ic_assistant_avatar.png, ic_skill_learning_avatar.png, ic_customer_service_avatar.png)

## Server

By default reads `VITE_MOBILE_AGENT_BASE_URL` from `TopoDesktop/.env.local`.

## Built-in Resource Details (merged from `resources/*/README.md`)

### `resources/TopoClaw`

Built-in `topoclaw` runtime resources. Synced from repo source via `npm run setup:assistant`, invoked by the desktop embedded Python environment.

### `resources/group-manager`

Built-in SimpleChat Assistant (pure LLM Q&A assistant) resources, supporting:

- `WebSocket /ws` — streaming chat (`{type:"chat", thread_id, message, images?}`)
- `GET /health` — health check
- `GET /api/version` — version info

Typical startup (example):

```bash
cd Assistants/SimpleChatAssistant
pip install -r requirements.txt
python main.py --port 8320 --api-key sk-xxx
```

Requires `OPENAI_API_KEY` (via `.env` or startup argument).

### `resources/python-embed`

Stores the Windows Python Embeddable Package for desktop execution capabilities.

- Recommended: run `npm run setup:python` to auto-download/verify/install dependencies
- Packaging copies this directory into the installer's `resources`
- For manual setup, ensure `python.exe`, `python3xx._pth`, `Lib/`, etc. exist in this directory
