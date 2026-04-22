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

"""聊天历史存储 - 简单 in-memory 实现"""

import threading
from typing import List, Dict

_store: Dict[str, List[dict]] = {}
_lock = threading.Lock()


def append_messages(thread_id: str, user_content: str, assistant_content: str) -> None:
    """追加一轮对话"""
    with _lock:
        if thread_id not in _store:
            _store[thread_id] = []
        msgs = _store[thread_id]
        order = len(msgs)
        msgs.append({"role": "user", "content": user_content, "order": order})
        msgs.append({"role": "assistant", "content": assistant_content, "order": order + 1})


def get_messages(thread_id: str, limit: int = 100) -> List[dict]:
    """获取会话历史，按 order 排序"""
    with _lock:
        msgs = _store.get(thread_id, [])
        return sorted(msgs, key=lambda m: m.get("order", 0))[-limit:]
