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

"""配置模块 - 纯 LLM 问答小助手，无工具"""

import os


def get_llm_base_url() -> str:
    """获取 LLM API 地址"""
    return os.getenv("OPENAI_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")


def get_llm_model() -> str:
    """获取聊天模型名称"""
    return os.getenv("OPENAI_MODEL_NAME", "qwen3.5-397b-a17b")


def get_api_key() -> str:
    """获取 API Key"""
    return os.getenv("OPENAI_API_KEY") or os.getenv("DASHSCOPE_API_KEY") or "empty"
