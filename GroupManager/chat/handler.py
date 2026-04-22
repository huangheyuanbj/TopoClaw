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
Chat 处理逻辑 - 纯 LLM 问答，无工具
支持群组管理者模式：解析前端注入的【群组小助手列表】上下文，并入系统提示
"""

import json
import logging
import re
from typing import Optional, List, Any, Tuple

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """你是一个友好的智能助手，可以回答用户的各种问题。请用简洁、准确的语句回复。"""

# 群组管理者专用系统提示：当有群组小助手上下文时，强调推荐、分流与直接调用能力
GROUP_MANAGER_ROLE = """你是群组管理小助手。用户可能咨询某项任务可以由群内哪个小助手完成。

当你能明确判断某项任务适合由某小助手执行时，你必须：
1. 简要说明推荐理由（一两句即可）
2. 在回复末尾单独另起一行，严格按以下格式输出以触发自动执行：
   @小助手名 改写后的执行指令
   其中「改写后的执行指令」需将用户原意提炼为可直接执行的简短指令（如「打开小红书」「记录当前操作」），不要带「请」「帮我」等前缀。

示例：用户问「我想打开小红书」，你应回复：
建议使用 自动执行小助手，它支持手机端自动化任务。

@自动执行小助手 打开小红书

若用户问题与任务分配无关（闲聊、无法匹配小助手等），则正常对话回复，不要输出 @ 行。"""

# 执行结果反馈模式：群组管理小助手收到被调用小助手的执行结果后，判断任务完成情况并决定总结或继续调度
GROUP_MANAGER_FEEDBACK_ROLE = """你是群组管理小助手。你之前推荐了某小助手执行任务，现已收到执行结果。

请根据「用户原始请求」和「执行结果」判断任务是否完成：
1. 若完成：用简洁语言总结并回复用户（1-3 句即可），不要输出 @ 行。
2. 若未完成或需进一步操作：简要说明原因，并可在回复末尾单独另起一行按以下格式输出以触发下一轮执行：
   @小助手名 改写后的执行指令
   其中「改写后的执行指令」需针对当前情况给出可执行的新指令。最多可调度 100 轮。

若执行结果已充分满足用户需求，务必给出总结，不要重复调度。"""


def parse_role_prompt_and_query(message: str) -> Tuple[Optional[str], str]:
    """
    解析前端注入结构化内容：
    【用户设置角色提示词 ROLE_PROMPT】
    ...
    【用户本轮请求 QUERY】
    ...
    返回：(role_prompt, query_text)
    """
    if not message or not isinstance(message, str):
        return None, message or ""
    text = message.strip()
    rp_marker = "【用户设置角色提示词 ROLE_PROMPT】"
    q_marker = "【用户本轮请求 QUERY】"
    if rp_marker not in text or q_marker not in text:
        return None, message
    pattern = re.compile(
        rf"{re.escape(rp_marker)}\s*(.*?)\s*{re.escape(q_marker)}\s*(.*)",
        re.S,
    )
    m = pattern.search(text)
    if not m:
        return None, message
    role_prompt = (m.group(1) or "").strip()
    query_text = (m.group(2) or "").strip()
    if role_prompt.startswith("请严格区分："):
        role_prompt = ""
    if "\n请严格区分：" in query_text:
        query_text = query_text.split("\n请严格区分：", 1)[0].strip()
    if not query_text:
        query_text = message
    return role_prompt or None, query_text


def parse_group_manager_message(message: str) -> Tuple[Optional[str], str]:
    """
    解析群组管理者消息：前端会注入群组上下文 + 用户消息。
    支持两种格式：
    1. 新格式：【当前群聊信息】...【用户消息】<用户实际内容>
    2. 旧格式：【群组小助手列表】...用户消息：<用户实际内容>
    返回：(group_context, user_message)，若无则 (None, message)
    """
    if not message or not isinstance(message, str):
        return None, message or ""
    # 新格式：【当前群聊信息】...【用户消息】...
    user_msg_marker = "【用户消息】"
    if "【当前群聊信息】" in message and user_msg_marker in message:
        idx = message.find(user_msg_marker)
        context = message[:idx].strip()
        user_msg = message[idx + len(user_msg_marker):].strip()
        if context:
            return context, user_msg or message
    # 旧格式：【群组小助手列表】...用户消息：...
    sep = "用户消息："
    if "【群组小助手列表】" in message and sep in message:
        parts = message.split(sep, 1)
        context = parts[0].strip()
        user_msg = parts[1].strip() if len(parts) > 1 else ""
        if context and context.startswith("【群组小助手列表】"):
            return context, user_msg
    return None, message


def parse_execution_feedback_message(message: str) -> Tuple[bool, Optional[str], str]:
    """
    解析执行结果反馈消息：群组管理小助手收到执行结果后的跟进请求
    格式：【执行结果反馈】\\n[【群组小助手列表】...\\n\\n]用户原始请求：...\\n执行小助手：...\\n执行指令：...\\n执行结果：...\\n当前轮次：...
    返回：(is_feedback, group_context, user_message)。若非反馈格式则 (False, None, message)
    """
    if not message or not isinstance(message, str):
        return False, None, message or ""
    text = message.strip()
    if not text.startswith("【执行结果反馈】"):
        return False, None, message
    # 提取【群组小助手列表】若存在（用于反馈模式下 LLM 知道可调度的其他小助手）
    group_context = None
    rest = text[len("【执行结果反馈】"):].strip()
    if "【群组小助手列表】" in rest and "用户原始请求：" in rest:
        idx = rest.find("【群组小助手列表】")
        ctx_end = rest.find("用户原始请求：", idx)
        if ctx_end >= 0:
            group_context = rest[idx:ctx_end].strip()
            rest = rest[ctx_end:]
    # rest 现在以「用户原始请求：」开头，整段作为 user message 传给 LLM
    return True, group_context, rest


def _messages_for_log(messages: list) -> str:
    """将 messages 转为可打印的字符串"""
    out = []
    for m in messages:
        role = m.get("role", "")
        content = m.get("content", "")
        if isinstance(content, list):
            parts = []
            for p in content:
                if isinstance(p, dict):
                    if p.get("type") == "text":
                        parts.append(p.get("text", ""))
                    elif p.get("type") == "image_url":
                        parts.append("[图片]")
                else:
                    parts.append(str(p)[:100])
            content = "".join(parts)
        elif isinstance(content, str) and len(content) > 500:
            content = content[:500] + "..."
        out.append(f"{role}: {content}")
    return "\n".join(out)


def _dict_messages_to_lc(messages: List[dict]):
    """将 dict 格式 messages 转为 LangChain 格式"""
    lc = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if isinstance(content, list):
            lc.append(HumanMessage(content=content))
        elif role == "system":
            lc.append(SystemMessage(content=content))
        elif role == "assistant":
            lc.append(AIMessage(content=content))
        else:
            lc.append(HumanMessage(content=content))
    return lc


async def handle_chat_stream(
    thread_id: str,
    message: str,
    images: Optional[List[str]] = None,
    history: Optional[List[dict]] = None,
    websocket: Optional[Any] = None,
    group_context: Optional[str] = None,
    execution_feedback: bool = False,
    user_role_prompt: Optional[str] = None,
    **kwargs,
):
    """
    流式聊天，纯 LLM 问答，无工具。
    若传入 group_context（群组小助手列表），则作为群组管理者模式，扩展系统提示。
    若 execution_feedback=True，则使用执行结果反馈模式（GROUP_MANAGER_FEEDBACK_ROLE）。
    yield SSE 格式：data: {"delta": "..."} 或 data: {"error": "..."}
    """
    import os
    import sys
    _root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _root not in sys.path:
        sys.path.insert(0, _root)
    from core.model_client import get_llm

    system_content = SYSTEM_PROMPT
    if execution_feedback:
        role_prompt = GROUP_MANAGER_FEEDBACK_ROLE
    else:
        role_prompt = GROUP_MANAGER_ROLE
    if group_context or execution_feedback:
        ctx_part = f"\n\n{group_context}\n\n" if group_context else "\n\n"
        system_content = f"{system_content}{ctx_part}{role_prompt}"
    if user_role_prompt and user_role_prompt.strip():
        system_content = (
            f"{system_content}\n\n"
            "【用户单独设置的角色提示词】\n"
            f"{user_role_prompt.strip()}\n\n"
            "请注意：上面这段是用户长期角色约束，不是本轮 query。"
        )
    messages = [{"role": "system", "content": system_content}]
    if history:
        for h in history[-10:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    content = message
    if images:
        text_part = (message or "").strip()
        if not text_part or text_part == "[图片]":
            text_part = "请描述或分析这张图片。"
        parts = [{"type": "text", "text": text_part}]
        for img_b64 in images[:3]:
            if img_b64 and len(img_b64) > 100:
                parts.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{img_b64}" if not img_b64.startswith("data:") else img_b64}
                })
        content = parts
    messages.append({"role": "user", "content": content})

    logger.info("[模型输入]\n%s", _messages_for_log(messages))

    llm = get_llm()
    lc_messages = _dict_messages_to_lc(messages)
    full_text = ""
    try:
        async for chunk in llm.astream(lc_messages):
            c = getattr(chunk, "content", "") or ""
            if isinstance(c, str) and c:
                full_text += c
                yield f"data: {json.dumps({'delta': c}, ensure_ascii=False)}\n\n"
        logger.info("[模型输出]\n%s", full_text[:2000] + ("..." if len(full_text) > 2000 else ""))
        yield f"data: {json.dumps({'need_execution': False, 'chat_summary': None}, ensure_ascii=False)}\n\n"
    except Exception as e:
        logger.exception("stream_chat 失败")
        yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
