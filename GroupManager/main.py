# -*- coding: utf-8 -*-
# Copyright 2025 OPPO

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     http://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
纯 LLM 问答小助手 - WebSocket /ws
无任何工具，仅提供简单 LLM 问答；支持前端通过「聊天（其他）」创建的接口直接访问
"""

import os
import sys
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, Query

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from chat.ws_handler import handle_ws_chat
from chat.history_store import get_messages

logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(name)s - %(message)s")
logger = logging.getLogger(__name__)


def _asyncio_exception_handler(loop, context):
    exc = context.get("exception")
    if exc is not None:
        if isinstance(exc, (ConnectionResetError, BrokenPipeError)):
            logger.debug("连接关闭: %s", exc)
            return
        if isinstance(exc, OSError) and getattr(exc, "winerror", None) in (10054, 10053):
            logger.debug("连接关闭: %s", exc)
            return
    loop.default_exception_handler(context)


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = __import__("asyncio").get_running_loop()
    loop.set_exception_handler(_asyncio_exception_handler)
    yield


app = FastAPI(
    title="SimpleChat Assistant API",
    version="0.1.0",
    description="纯 LLM 问答小助手，无工具，支持 WebSocket /ws，可通过「聊天（其他）」直接访问",
    lifespan=lifespan,
)


@app.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    """聊天 WebSocket：发送 {type:'chat', thread_id, message, images?}，流式收到 delta、done"""
    await handle_ws_chat(websocket)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/version")
async def version():
    return {"success": True, "version": "0.1.0"}


@app.get("/chat/history")
async def chat_history(
    thread_id: str = Query(..., description="会话 ID"),
    limit: int = Query(100, ge=1, le=500, description="返回条数上限"),
):
    """获取会话历史，用于跨设备加载"""
    messages = get_messages(thread_id, limit=limit)
    return {"messages": messages, "thread_id": thread_id}


def parse_args():
    import argparse
    p = argparse.ArgumentParser(description="纯 LLM 问答小助手")
    p.add_argument("--host", type=str, default="0.0.0.0")
    p.add_argument("--port", type=int, default=8320)
    p.add_argument("--api-key", type=str, default=None)
    return p.parse_args()


if __name__ == "__main__":
    import uvicorn
    args = parse_args()
    if args.api_key:
        os.environ["OPENAI_API_KEY"] = args.api_key
    port = int(os.getenv("PORT", args.port))
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key == "empty":
        logger.warning("OPENAI_API_KEY 未设置，请在 .env 中设置或使用 --api-key 传入")
    logger.info("启动 SimpleChat Assistant: host=%s port=%d", args.host, port)
    uvicorn.run(app, host=args.host, port=port)
