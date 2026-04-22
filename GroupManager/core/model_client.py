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

"""统一模型调用封装 - 纯 LLM 问答"""

import logging
from typing import List

logger = logging.getLogger(__name__)

_llm = None


def get_llm():
    """获取或初始化 LLM 实例"""
    global _llm
    if _llm is None:
        import sys
        import os
        _root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if _root not in sys.path:
            sys.path.insert(0, _root)
        from langchain_openai import ChatOpenAI
        from config import get_llm_base_url, get_llm_model, get_api_key
        _llm = ChatOpenAI(
            base_url=get_llm_base_url(),
            model=get_llm_model(),
            api_key=get_api_key(),
            temperature=0.3,
            max_tokens=2048,
        )
        logger.info("LLM 初始化完成")
    return _llm
