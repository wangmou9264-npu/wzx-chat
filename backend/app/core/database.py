"""
SQLite 异步数据库模块 - 使用 aiosqlite
表结构:
  - conversations: id, title, created_at, updated_at
  - messages: id, conversation_id, role, content, created_at, model, reasoning_content
"""
import aiosqlite
from datetime import datetime
from typing import Any, Optional

from app.core.config import settings


async def get_db() -> aiosqlite.Connection:
    """获取数据库连接，启用外键约束和行工厂"""
    conn = await aiosqlite.connect(settings.DATABASE_PATH)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys = ON")
    return conn


async def init_db():
    """初始化数据库表"""
    conn = await get_db()
    try:
        await conn.executescript("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT 'New Conversation',
                model TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL DEFAULT '',
                reasoning_content TEXT NOT NULL DEFAULT '',
                model TEXT NOT NULL DEFAULT '',
                images TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
        """)
        # 兼容旧数据库：尝试添加 model 列（已存在则忽略）
        try:
            await conn.execute("ALTER TABLE conversations ADD COLUMN model TEXT NOT NULL DEFAULT ''")
        except Exception:
            pass
        await conn.commit()
    finally:
        await conn.close()


# ============ Conversations CRUD ============

async def create_conversation(title: str = "New Conversation", model: str = "") -> dict[str, Any]:
    """创建对话，返回完整对话对象"""
    now = datetime.utcnow().isoformat()
    conn = await get_db()
    try:
        cursor = await conn.execute(
            "INSERT INTO conversations (title, model, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (title, model, now, now),
        )
        await conn.commit()
        conv_id = cursor.lastrowid
        return {
            "id": str(conv_id),
            "title": title,
            "model": model,
            "created_at": now,
            "updated_at": now,
        }
    finally:
        await conn.close()


async def list_conversations() -> list[dict[str, Any]]:
    """获取所有对话列表，按更新时间倒序。id转为字符串以匹配前端。"""
    conn = await get_db()
    try:
        cursor = await conn.execute(
            "SELECT id, title, model, created_at, updated_at FROM conversations ORDER BY updated_at DESC"
        )
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["id"] = str(d["id"])
            result.append(d)
        return result
    finally:
        await conn.close()


async def get_conversation(conv_id: int) -> Optional[dict[str, Any]]:
    """获取单个对话元信息"""
    conn = await get_db()
    try:
        cursor = await conn.execute(
            "SELECT id, title, model, created_at, updated_at FROM conversations WHERE id = ?",
            (conv_id,),
        )
        row = await cursor.fetchone()
        if row:
            d = dict(row)
            d["id"] = str(d["id"])
            return d
        return None
    finally:
        await conn.close()


async def get_conversation_with_messages(conv_id: int) -> Optional[dict[str, Any]]:
    """获取对话详情及全部消息。消息字段 reasoning_content 映射为 thinking。"""
    conv = await get_conversation(conv_id)
    if not conv:
        return None

    conn = await get_db()
    try:
        cursor = await conn.execute(
            "SELECT id, role, content, reasoning_content, model, images, created_at "
            "FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conv_id,),
        )
        rows = await cursor.fetchall()
        messages = []
        for r in rows:
            d = dict(r)
            d["id"] = str(d["id"])
            d["thinking"] = d.pop("reasoning_content", "")
            messages.append(d)
        conv["messages"] = messages
        return conv
    finally:
        await conn.close()


async def delete_conversation(conv_id: int) -> bool:
    """删除对话（级联删除消息），返回是否删除成功"""
    conn = await get_db()
    try:
        cursor = await conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
        await conn.commit()
        return cursor.rowcount > 0
    finally:
        await conn.close()


async def rename_conversation(conv_id: int, title: str) -> bool:
    """重命名对话"""
    now = datetime.utcnow().isoformat()
    conn = await get_db()
    try:
        cursor = await conn.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
            (title, now, conv_id),
        )
        await conn.commit()
        return cursor.rowcount > 0
    finally:
        await conn.close()


async def touch_conversation(conv_id: int):
    """更新对话的 updated_at 时间戳"""
    now = datetime.utcnow().isoformat()
    conn = await get_db()
    try:
        await conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conv_id)
        )
        await conn.commit()
    finally:
        await conn.close()


# ============ Messages CRUD ============

async def save_message(
    conversation_id: int,
    role: str,
    content: str,
    model: str = "",
    reasoning_content: str = "",
    images: str = "[]",
) -> int:
    """保存一条消息，返回消息 ID"""
    now = datetime.utcnow().isoformat()
    conn = await get_db()
    try:
        cursor = await conn.execute(
            "INSERT INTO messages (conversation_id, role, content, reasoning_content, model, images, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (conversation_id, role, content, reasoning_content, model, images, now),
        )
        await conn.commit()
        # 同时更新对话的 updated_at
        await touch_conversation(conversation_id)
        return cursor.lastrowid
    finally:
        await conn.close()


async def get_messages_for_openai(conversation_id: int) -> list[dict[str, Any]]:
    """
    获取对话历史，格式化为 OpenAI chat completions 所需的 messages 格式。
    自动处理多模态图片。
    """
    import json

    conn = await get_db()
    try:
        cursor = await conn.execute(
            "SELECT role, content, images FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,),
        )
        rows = await cursor.fetchall()
    finally:
        await conn.close()

    messages = []
    for row in rows:
        msg = {"role": row["role"], "content": row["content"]}
        # 处理图片（仅 user 消息）
        if row["role"] == "user" and row["images"]:
            try:
                images = json.loads(row["images"])
                if images:
                    # 构建多模态 content 列表
                    content_parts = [{"type": "text", "text": row["content"]}]
                    for img_b64 in images:
                        content_parts.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
                        })
                    msg["content"] = content_parts
            except (json.JSONDecodeError, TypeError):
                pass
        messages.append(msg)

    return messages
