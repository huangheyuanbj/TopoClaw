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
WebSocket 聊天处理器 - 纯 LLM 问答小助手
接收 type=chat 消息，通过 handle_chat_stream 流式返回；支持 ping、register、subscribe_thread
"""
import asyncio
import json
import logging

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from chat.connection_manager import (
    add_connection,
    get_connection_info,
    get_online_count,
    push_to,
    register as register_conn,
    remove_connection,
    subscribe_thread,
    unsubscribe_thread,
)
from chat.handler import (
    handle_chat_stream,
    parse_group_manager_message,
    parse_execution_feedback_message,
    parse_role_prompt_and_query,
)

logger = logging.getLogger(__name__)

_SHUTDOWN = object()


async def _send_safe(websocket: WebSocket, msg: dict) -> bool:
    """发送 JSON，若连接已关闭返回 False"""
    try:
        await websocket.send_json(msg)
        return True
    except RuntimeError as e:
        if "close message" in str(e).lower() or "send" in str(e).lower():
            logger.debug("WebSocket 已关闭，无法发送: %s", e)
            return False
        raise
    except Exception as e:
        logger.debug("WebSocket 发送失败: %s", e)
        return False


async def _receiver(websocket: WebSocket, chat_queue: asyncio.Queue):
    """接收循环：处理 ping、register、subscribe_thread、chat"""
    while True:
        try:
            data = await websocket.receive_text()
        except WebSocketDisconnect:
            logger.info("客户端已断开连接")
            break
        try:
            msg = json.loads(data)
        except json.JSONDecodeError:
            try:
                await websocket.send_json({"type": "error", "error": "无效 JSON"})
            except Exception:
                break
            continue
        if not isinstance(msg, dict):
            try:
                await websocket.send_json({"type": "error", "error": "消息必须是对象"})
            except Exception:
                break
            continue
        msg_type = msg.get("type")
        if msg_type == "ping":
            logger.info("[WebSocket] 收到 ping，回复 pong")
            try:
                await websocket.send_json({"type": "pong"})
            except Exception:
                break
            continue
        if msg_type == "register":
            thread_id = msg.get("thread_id")
            device_id = msg.get("device_id")
            device_type = msg.get("device_type", "unknown")
            base_url = msg.get("base_url")
            logger.info("[WebSocket] 收到 register: device_id=%s, device_type=%s, base_url=%s, thread_id=%s", device_id, device_type, base_url, thread_id)
            if not device_id:
                try:
                    await websocket.send_json({"type": "error", "error": "register 需提供 device_id"})
                except Exception:
                    break
                continue
            register_conn(
                websocket,
                thread_id if thread_id and str(thread_id).strip() else None,
                device_id,
                device_type,
                base_url=base_url,
                supports_code_execute=False,
                supports_gui_execute=False,
            )
            try:
                await websocket.send_json({"type": "registered", "thread_id": thread_id or ""})
                logger.info("[WebSocket] 已回复 registered: device_id=%s", device_id)
            except Exception:
                break
            continue
        if msg_type == "subscribe_thread":
            tid = msg.get("thread_id")
            if tid:
                subscribe_thread(websocket, tid)
            continue
        if msg_type == "unsubscribe_thread":
            tid = msg.get("thread_id")
            if tid:
                unsubscribe_thread(websocket, tid)
            continue
        if msg_type == "chat":
            try:
                await chat_queue.put(msg)
            except asyncio.CancelledError:
                break
            continue
        try:
            await websocket.send_json({"type": "error", "error": f"未知类型: {msg_type}"})
        except Exception:
            break
    try:
        await chat_queue.put(_SHUTDOWN)
    except Exception:
        pass


async def _worker(websocket: WebSocket, chat_queue: asyncio.Queue):
    """工作循环：从队列取 chat，调用 handle_chat_stream 并流式发送"""
    from chat.history_store import append_messages, get_messages

    while True:
        try:
            msg = await chat_queue.get()
        except asyncio.CancelledError:
            break
        if msg is _SHUTDOWN:
            break
        thread_id = msg.get("thread_id")
        message = msg.get("message", "")
        images = msg.get("images")
        if isinstance(images, list):
            images = [i for i in images if i and isinstance(i, str) and len(i) > 100]
        else:
            images = None
        if not thread_id:
            try:
                await websocket.send_json({"type": "error", "error": "缺少 thread_id"})
            except Exception:
                pass
            continue
        user_role_prompt, parsed_message = parse_role_prompt_and_query(message)
        is_feedback, feedback_group_ctx, feedback_user_msg = parse_execution_feedback_message(parsed_message)
        if is_feedback:
            group_context, user_message = feedback_group_ctx, feedback_user_msg
            execution_feedback = True
        else:
            group_context, user_message = parse_group_manager_message(parsed_message)
            execution_feedback = False
        history = get_messages(thread_id, limit=20)
        full_text = ""
        need_execution = False
        chat_summary = None
        try:
            async for chunk in handle_chat_stream(
                thread_id=thread_id,
                message=user_message,
                images=images,
                history=history,
                websocket=websocket,
                group_context=group_context,
                execution_feedback=execution_feedback,
                user_role_prompt=user_role_prompt,
            ):
                if not chunk.startswith("data: "):
                    continue
                try:
                    obj = json.loads(chunk[6:].strip())
                except json.JSONDecodeError:
                    continue
                if "error" in obj:
                    if not await _send_safe(websocket, {"type": "error", "error": obj["error"]}):
                        break
                    break
                if "delta" in obj:
                    full_text += obj["delta"]
                    if not await _send_safe(websocket, {"type": "delta", "content": obj["delta"]}):
                        break
                elif "tool_call" in obj:
                    if not await _send_safe(websocket, {"type": "tool_call", "name": obj["tool_call"]}):
                        break
                elif "need_execution" in obj:
                    need_execution = obj.get("need_execution", False)
                    chat_summary = obj.get("chat_summary")
            if full_text:
                append_messages(thread_id, user_message, full_text)
            await _send_safe(
                websocket,
                {
                    "type": "done",
                    "need_execution": need_execution,
                    "chat_summary": chat_summary,
                    "response": full_text,
                },
            )
            info = get_connection_info(websocket)
            sender_device_id = info.get("device_id") if info else None
            await push_to(
                thread_id,
                {"type": "assistant_push", "thread_id": thread_id, "content": full_text},
                exclude_device_id=sender_device_id,
            )
        except Exception as e:
            err_str = str(e)
            if "close message" in err_str.lower() or ("send" in err_str.lower() and "close" in err_str.lower()):
                logger.debug("客户端已断开，chat stream 终止: %s", e)
            else:
                logger.exception("chat stream 失败")
            await _send_safe(websocket, {"type": "error", "error": err_str[:200]})


async def handle_ws_chat(websocket: WebSocket):
    """
    处理 WebSocket 连接：
    - register: {type:"register", thread_id?, device_id, device_type?, base_url?}
    - chat: {type:"chat", thread_id, message, images?}
    - ping: {type:"ping"}
    """
    await websocket.accept()
    add_connection(websocket)
    chat_queue: asyncio.Queue = asyncio.Queue()
    recv_task = asyncio.create_task(_receiver(websocket, chat_queue))
    work_task = asyncio.create_task(_worker(websocket, chat_queue))
    try:
        await asyncio.gather(recv_task, work_task)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.exception("WebSocket 任务异常: %s", e)
    finally:
        recv_task.cancel()
        work_task.cancel()
        try:
            await recv_task
        except asyncio.CancelledError:
            pass
        try:
            await work_task
        except asyncio.CancelledError:
            pass
        remove_connection(websocket)
        try:
            await websocket.close()
        except Exception:
            pass
