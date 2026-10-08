"""
对话管理 REST API
- GET    /api/conversations       - 对话列表
- POST   /api/conversations       - 创建对话
- GET    /api/conversations/{id}  - 对话详情
- DELETE /api/conversations/{id}  - 删除对话
- PATCH  /api/conversations/{id}  - 重命名对话
"""
from fastapi import APIRouter, HTTPException

from app.core import database as db
from app.models.schemas import ConversationCreate, ConversationRename

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("")
async def list_conversations():
    """获取所有对话列表（直接返回数组）"""
    return await db.list_conversations()


@router.post("")
async def create_conversation(body: ConversationCreate):
    """创建新对话，返回完整对话对象"""
    return await db.create_conversation(title=body.title, model=body.model)


@router.get("/{conv_id}")
async def get_conversation(conv_id: int):
    """获取对话详情（含消息列表）"""
    conv = await db.get_conversation_with_messages(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.delete("/{conv_id}")
async def delete_conversation(conv_id: int):
    """删除对话"""
    ok = await db.delete_conversation(conv_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}


@router.patch("/{conv_id}")
async def rename_conversation(conv_id: int, body: ConversationRename):
    """重命名对话"""
    ok = await db.rename_conversation(conv_id, body.title)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}
