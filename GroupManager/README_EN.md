# SimpleChat Assistant — Pure LLM Q&A Assistant for Group Management

No tools — just simple LLM Q&A. Provides a WebSocket interface accessible through the "Chat (Other)" integration.

## API

- `WebSocket /ws` — Chat (streaming): send `{type:"chat", thread_id, message, images?}`, receive delta and done events
- `GET /health` — Health check
- `GET /api/version` — Version info

## Usage

1. Go to **Settings → New Assistant** and enter this service's URL
2. Enable the capability: **Other (Chat)**
3. Generate a link / QR code; users can scan to add and start using it

## Startup

```bash
cd Assistants/SimpleChatAssistant
pip install -r requirements.txt
python main.py --port 8320 --api-key sk-xxx
```

**API Key is required**:
- Create a `.env` file in the project root with: `OPENAI_API_KEY=sk-your-api-key`
- Or pass it as a startup argument: `--api-key sk-xxx`

Optional environment variables: `OPENAI_BASE_URL`, `OPENAI_MODEL_NAME`.

## Directory Structure

```
SimpleChatAssistant/
├── main.py          # Entry point & routes
├── config.py        # Configuration
├── core/
│   └── model_client.py
└── chat/
    ├── ws_handler.py
    ├── handler.py
    ├── history_store.py
    └── connection_manager.py
```
