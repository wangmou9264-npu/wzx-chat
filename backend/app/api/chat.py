"""
SSE 对话接口 - POST /api/chat/stream/{conversation_id}
- 请求体: {"content":"...","model":"...","images":["base64..."]}
- 响应: text/event-stream，每行一个 JSON 事件
  - data: {"type":"thinking","content":"..."}   推理过程增量
  - data: {"type":"token","content":"..."}      输出增量
  - data: {"type":"done","usage":{...}}        完成
  - data: {"type":"error","message":"..."}      错误
"""
import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core import database as db
from app.services.opencode import stream_chat_completion

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    content: str = ""
    model: str = "space-bunny-free"
    images: list[str] = []


def sse_event(data: dict) -> str:
    """构造 SSE 事件格式"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/api/chat/stream/{conversation_id}")
async def sse_chat(conversation_id: int, req: ChatRequest):
    """
    SSE 对话接口。
    接收用户消息 -> 保存 -> 加载历史 -> 调用 OpenCode 流式接口 -> SSE 推送增量 -> 保存 AI 回复
    """
    # 验证对话存在
    conv = await db.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")

    user_content = req.content or ""
    model = req.model or "space-bunny-free"
    images = req.images or []

    if not user_content and not images:
        raise HTTPException(status_code=400, detail="Empty message")

    async def event_generator():
        # 保存用户消息
        images_json = json.dumps(images) if images else "[]"
        await db.save_message(
            conversation_id=conversation_id,
            role="user",
            content=user_content,
            images=images_json,
        )

        # 加载对话历史（含刚保存的用户消息）
        messages = await db.get_messages_for_openai(conversation_id)

        # 流式调用 OpenCode API
        full_content = ""
        full_reasoning = ""

        try:
            async for event in stream_chat_completion(
                conversation_id=str(conversation_id),
                model=model,
                messages=messages,
            ):
                event_type = event.get("type")

                if event_type == "thinking":
                    delta = event.get("content", "")
                    full_reasoning += delta
                    yield sse_event({"type": "thinking", "content": delta})

                elif event_type == "token":
                    delta = event.get("content", "")
                    full_content += delta
                    yield sse_event({"type": "token", "content": delta})

                elif event_type == "done":
                    usage = event.get("usage", {})
                    # 保存 AI 回复到数据库
                    await db.save_message(
                        conversation_id=conversation_id,
                        role="assistant",
                        content=full_content,
                        model=model,
                        reasoning_content=full_reasoning,
                    )
                    yield sse_event({"type": "done", "usage": usage})

                elif event_type == "error":
                    err_msg = event.get("message", "Unknown error")
                    yield sse_event({"type": "error", "message": err_msg})
                    # 也保存错误的 AI 回复
                    await db.save_message(
                        conversation_id=conversation_id,
                        role="assistant",
                        content=f"[Error] {err_msg}",
                        model=model,
                        reasoning_content=full_reasoning,
                    )

        except Exception as e:
            logger.exception("Streaming error")
            yield sse_event({"type": "error", "message": f"Internal error: {str(e)}"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
