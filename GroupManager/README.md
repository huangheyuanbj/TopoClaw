# SimpleChat Assistant - 纯 LLM 问答小助手，用作群组管理助手

无任何工具，仅提供简单 LLM 问答。支持 WebSocket 接口，可通过「聊天（其他）」创建的接口直接访问。

## 接口

- `WebSocket /ws` - 聊天（流式），发送 `{type:"chat", thread_id, message, images?}` 接收 delta、done
- `GET /health` - 健康检查
- `GET /api/version` - 版本信息

## 使用方式

1. 在**设置 → 新建小助手**中填写本服务地址
2. 小助手功能勾选：**其他（聊天）**
3. 生成链接/二维码，用户扫码添加后即可使用

## 启动

```bash
cd Assistants/SimpleChatAssistant
pip install -r requirements.txt
python main.py --port 8320 --api-key sk-xxx
```

**必须配置 API Key**：
- 在项目根目录创建 `.env`，写入：`OPENAI_API_KEY=sk-your-api-key`
- 或使用启动参数：`--api-key sk-xxx`

可选环境变量：`OPENAI_BASE_URL`、`OPENAI_MODEL_NAME`。

## 目录结构

```
SimpleChatAssistant/
├── main.py          # 入口与路由
├── config.py        # 配置
├── core/
│   └── model_client.py
└── chat/
    ├── ws_handler.py
    ├── handler.py
    ├── history_store.py
    └── connection_manager.py
```
