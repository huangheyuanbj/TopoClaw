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

"""WebSocket 连接管理器"""

import logging
from typing import Dict, Optional, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)

_registry: Dict[WebSocket, dict] = {}
_by_thread: Dict[str, Dict[str, WebSocket]] = {}
_ws_subscribed: Dict[WebSocket, Set[str]] = {}


def register(
    ws: WebSocket,
    thread_id: Optional[str],
    device_id: str,
    device_type: str = "unknown",
    base_url: Optional[str] = None,
    **kwargs,
) -> None:
    """注册连接"""
    multi_thread = not (thread_id and thread_id.strip())
    _registry[ws] = {
        "thread_id": thread_id if not multi_thread else None,
        "device_id": device_id,
        "device_type": device_type,
        "multi_thread": multi_thread,
        "base_url": (base_url or "").strip().rstrip("/") or None,
    }
    if multi_thread:
        _ws_subscribed[ws] = set()
    else:
        if thread_id not in _by_thread:
            _by_thread[thread_id] = {}
        _by_thread[thread_id][device_id] = ws


def subscribe_thread(ws: WebSocket, thread_id: str) -> None:
    """多 thread 模式：订阅指定 thread"""
    if not thread_id or not thread_id.strip():
        return
    info = _registry.get(ws)
    if not info or not info.get("multi_thread"):
        return
    if thread_id not in _by_thread:
        _by_thread[thread_id] = {}
    _by_thread[thread_id][info["device_id"]] = ws
    _ws_subscribed.setdefault(ws, set()).add(thread_id)


def unsubscribe_thread(ws: WebSocket, thread_id: str) -> None:
    """多 thread 模式：取消订阅"""
    if not thread_id or not thread_id.strip():
        return
    info = _registry.get(ws)
    if not info:
        return
    device_id = info["device_id"]
    if thread_id in _by_thread:
        if device_id in _by_thread[thread_id] and _by_thread[thread_id][device_id] is ws:
            del _by_thread[thread_id][device_id]
        if not _by_thread[thread_id]:
            del _by_thread[thread_id]
    _ws_subscribed.get(ws, set()).discard(thread_id)


def remove_connection(ws: WebSocket) -> None:
    """移除连接"""
    info = _registry.pop(ws, None)
    subs = _ws_subscribed.pop(ws, None)
    if info:
        device_id = info["device_id"]
        thread_id = info.get("thread_id")
        if thread_id and thread_id in _by_thread:
            _by_thread[thread_id].pop(device_id, None)
            if not _by_thread[thread_id]:
                del _by_thread[thread_id]
        if subs:
            for tid in subs:
                if tid in _by_thread:
                    _by_thread[tid].pop(device_id, None)
                    if not _by_thread[tid]:
                        del _by_thread[tid]


def add_connection(ws: WebSocket) -> None:
    """添加连接（未注册）"""
    if ws not in _registry:
        _registry[ws] = {"thread_id": None, "device_id": None, "device_type": None}


async def push_to(
    thread_id: str,
    payload: dict,
    exclude_device_id: Optional[str] = None,
) -> int:
    """向指定 thread_id 的连接推送"""
    if thread_id not in _by_thread:
        return 0
    dead = set()
    sent = 0
    for did, ws in list(_by_thread[thread_id].items()):
        if exclude_device_id and did == exclude_device_id:
            continue
        try:
            await ws.send_json(payload)
            sent += 1
        except Exception:
            dead.add(ws)
    for ws in dead:
        remove_connection(ws)
    return sent


def get_connection_info(ws: WebSocket) -> Optional[dict]:
    """获取连接的注册信息"""
    return _registry.get(ws)


def get_online_count() -> int:
    """获取当前在线连接数"""
    return len(_registry)
