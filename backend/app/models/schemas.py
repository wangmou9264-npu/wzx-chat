"""
Pydantic 数据模型 - 请求/响应 schema 定义
"""
from pydantic import BaseModel
from typing import Optional


# ============ Chat WebSocket ============

class ChatMessageIn(BaseModel):
    """客户端通过 WebSocket 发送的消息"""
    type: str = "message"
    content: str
    model: str = "space-bunny-free"
    images: list[str] = []


# ============ Conversations ============

class ConversationCreate(BaseModel):
    title: str = "New Conversation"
    model: str = ""


class ConversationRename(BaseModel):
    title: str


# ============ Sandbox ============

class SandboxRunRequest(BaseModel):
    code: str
    language: str = "python"


class SandboxRunResult(BaseModel):
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    timed_out: bool = False
