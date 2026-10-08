"""
模型列表 API - GET /api/models
"""
from fastapi import APIRouter

from app.services.opencode import get_available_models

router = APIRouter(prefix="/api", tags=["models"])


@router.get("/models")
async def list_models():
    """返回可用模型列表（直接返回数组）"""
    return await get_available_models()
