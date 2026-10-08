"""
OpenCode Zen API 封装服务
- 端点: https://opencode.ai/zen/v1/chat/completions
- 模拟 OpenCode CLI 请求头进行认证
- 支持 SSE 流式输出，解析 reasoning_content（思考过程）和 content（输出）
"""
import hashlib
import json
import uuid
from typing import AsyncGenerator, Any

import httpx

from app.core.config import settings


# 硬编码免费模型列表（作为兜底 / 初始列表）
FREE_MODELS_HARDCODED: list[dict[str, Any]] = [
    {"id": "space-bunny-free", "name": "Space Bunny (Free)", "supports_images": True},
    {"id": "big-pickle", "name": "Big Pickle", "supports_images": False},
    {"id": "longcat-2.5-preview-free", "name": "LongCat 2.5 Preview (Free)", "supports_images": False},
    {"id": "exo-free", "name": "Exo (Free)", "supports_images": False},
    {"id": "fledge-alpha-free", "name": "Fledge Alpha (Free)", "supports_images": False},
    {"id": "mimo-v2.6-flash-free", "name": "MiMo v2.6 Flash (Free)", "supports_images": True},
    {"id": "mimo-v2.5-free", "name": "MiMo v2.5 (Free)", "supports_images": False},
    {"id": "ling-3.1-flash-free", "name": "Ling 3.1 Flash (Free)", "supports_images": False},
    {"id": "ling-3.0-flash-fin-free", "name": "Ling 3.0 Flash Fin (Free)", "supports_images": False},
    {"id": "nemotron-3-ultra-free", "name": "Nemotron 3 Ultra (Free)", "supports_images": False},
    {"id": "nemotron-3.5-lightning-free", "name": "Nemotron 3.5 Lightning (Free)", "supports_images": False},
    {"id": "muse-spark-1.3-contributor-free", "name": "Muse Spark 1.3 Contributor (Free)", "supports_images": False},
    {"id": "muse-spark-1.2-contributor-free", "name": "Muse Spark 1.2 Contributor (Free)", "supports_images": False},
    {"id": "deepseek-v4-flash-free", "name": "DeepSeek v4 Flash (Free)", "supports_images": False},
]

# 支持图片输入的模型 ID 集合
IMAGE_SUPPORT_MODELS = {"space-bunny-free", "mimo-v2.6-flash-free"}


def _make_session_id(conversation_id: str) -> str:
    """根据 conversation_id 生成 x-opencode-session / X-Session-Id（sha256 前16位）"""
    return hashlib.sha256(conversation_id.encode()).hexdigest()[:16]


def _build_headers(conversation_id: str) -> dict[str, str]:
    """构建模拟 OpenCode CLI 的伪装请求头"""
    session_id = _make_session_id(conversation_id)
    return {
        "Authorization": f"Bearer {settings.OPENCODE_API_KEY}",
        "Content-Type": "application/json",
        "user-agent": "opencode/0.1.0",
        "x-opencode-client": "web",
        "x-opencode-session": session_id,
        "X-Session-Id": session_id,
        "x-opencode-request": str(uuid.uuid4()),
        "x-opencode-project": "default",
    }


async def get_available_models() -> list[dict[str, Any]]:
    """
    从 /v1/models 动态获取模型列表，过滤包含 'free' 的模型。
    如果动态获取失败，回退到硬编码列表。
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{settings.OPENCODE_BASE_URL}/models",
                headers=_build_headers("default"),
            )
            resp.raise_for_status()
            data = resp.json()
            models = data.get("data", [])

            free_models = []
            for m in models:
                mid = m.get("id", "")
                if "free" in mid.lower():
                    free_models.append({
                        "id": mid,
                        "name": m.get("name", mid),
                        "supports_images": mid in IMAGE_SUPPORT_MODELS,
                    })

            if free_models:
                return free_models
    except Exception:
        pass

    # 回退到硬编码列表
    return FREE_MODELS_HARDCODED


async def stream_chat_completion(
    conversation_id: str,
    model: str,
    messages: list[dict[str, Any]],
) -> AsyncGenerator[dict[str, Any], None]:
    """
    流式调用 OpenCode chat completions API。
    逐 yield 事件:
      - {"type": "thinking", "content": "..."}  推理过程增量
      - {"type": "token", "content": "..."}      输出增量
      - {"type": "done", "usage": {...}}         完成
    """
    url = f"{settings.OPENCODE_BASE_URL}/chat/completions"
    headers = _build_headers(conversation_id)

    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=settings.OPENCODE_TIMEOUT) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            if resp.status_code != 200:
                error_text = await resp.aread()
                yield {
                    "type": "error",
                    "message": f"OpenCode API error {resp.status_code}: {error_text.decode(errors='replace')[:500]}"
                }
                return

            # 累积完整内容用于 usage
            usage = {}

            async for line in resp.aiter_lines():
                if not line:
                    continue
                # SSE 格式: "data: {...}"
                if not line.startswith("data: "):
                    continue

                data_str = line[6:]  # 去掉 "data: " 前缀
                if data_str.strip() == "[DONE]":
                    break

                try:
                    chunk = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                # 检查错误
                if "error" in chunk:
                    yield {"type": "error", "message": str(chunk["error"])}
                    return

                # 解析 delta
                choices = chunk.get("choices", [])
                if not choices:
                    # 可能是 usage 信息
                    if "usage" in chunk:
                        usage = chunk["usage"]
                    continue

                delta = choices[0].get("delta", {})

                # 推理过程 (reasoning_content)
                reasoning = delta.get("reasoning_content", "")
                if reasoning:
                    yield {"type": "thinking", "content": reasoning}

                # 实际输出内容
                content = delta.get("content", "")
                if content:
                    yield {"type": "token", "content": content}

                # 累积 usage（部分提供商在最后一个 chunk 中包含 usage）
                if "usage" in chunk:
                    usage = chunk["usage"]

            # 流结束，推送 done 事件
            yield {
                "type": "done",
                "usage": usage or {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                },
            }
