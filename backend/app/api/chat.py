"""
WebSocket 对话接口 - WS /ws/chat/{conversation_id}
- 客户端发送: {"type":"message","content":"...","model":"...","images":["base64..."]}
- 服务端推送:
  - {"type":"thinking","content":"..."}   推理过程增量
  - {"type":"token","content":"..."}      输出增量
  - {"type":"done","usage":{...}}        完成
  - {"type":"error","message":"..."}      错误
"""
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core import database as db
from app.services.opencode import stream_chat_completion

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/chat/{conversation_id}")
async def websocket_chat(websocket: WebSocket, conversation_id: str):
    """
    WebSocket 对话主循环。
    接收用户消息 -> 加载历史 -> 调用 OpenCode 流式接口 -> 推送增量 -> 保存到数据库
    """
    await websocket.accept()
    conv_id_int = int(conversation_id)

    # 验证对话存在
    conv = await db.get_conversation(conv_id_int)
    if not conv:
        await websocket.send_json({"type": "error", "message": f"Conversation {conversation_id} not found"})
        await websocket.close()
        return

    try:
        while True:
            # 接收客户端消息
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            if data.get("type") != "message":
                await websocket.send_json({"type": "error", "message": f"Unknown type: {data.get('type')}"})
                continue

            user_content = data.get("content", "")
            model = data.get("model", "space-bunny-free")
            images = data.get("images", [])

            if not user_content and not images:
                await websocket.send_json({"type": "error", "message": "Empty message"})
                continue

            # 保存用户消息
            images_json = json.dumps(images) if images else "[]"
            await db.save_message(
                conversation_id=conv_id_int,
                role="user",
                content=user_content,
                images=images_json,
            )

            # 加载对话历史（含刚保存的用户消息）
            messages = await db.get_messages_for_openai(conv_id_int)

            # 流式调用 OpenCode API
            full_content = ""       # 累积 AI 输出
            full_reasoning = ""     # 累积推理过程

            try:
                async for event in stream_chat_completion(
                    conversation_id=conversation_id,
                    model=model,
                    messages=messages,
                ):
                    event_type = event.get("type")

                    if event_type == "thinking":
                        delta = event.get("content", "")
                        full_reasoning += delta
                        await websocket.send_json({"type": "thinking", "content": delta})

                    elif event_type == "token":
                        delta = event.get("content", "")
                        full_content += delta
                        await websocket.send_json({"type": "token", "content": delta})

                    elif event_type == "done":
                        usage = event.get("usage", {})
                        # 保存 AI 回复到数据库
                        await db.save_message(
                            conversation_id=conv_id_int,
                            role="assistant",
                            content=full_content,
                            model=model,
                            reasoning_content=full_reasoning,
                        )
                        await websocket.send_json({
                            "type": "done",
                            "usage": usage,
                        })

                    elif event_type == "error":
                        err_msg = event.get("message", "Unknown error")
                        await websocket.send_json({"type": "error", "message": err_msg})
                        # 也保存错误的 AI 回复
                        await db.save_message(
                            conversation_id=conv_id_int,
                            role="assistant",
                            content=f"[Error] {err_msg}",
                            model=model,
                            reasoning_content=full_reasoning,
                        )

            except Exception as e:
                logger.exception("Streaming error")
                await websocket.send_json({"type": "error", "message": f"Internal error: {str(e)}"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: conversation={conversation_id}")
    except Exception as e:
        logger.exception("WebSocket error")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
