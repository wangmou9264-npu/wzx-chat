"""
FastAPI 应用入口
- 挂载所有路由
- CORS 允许所有来源（本地部署，无账号系统）
- 挂载前端静态文件
- 健康检查端点
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db
from app.api import chat, conversations, models, sandbox

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期: 启动时初始化数据库"""
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database ready. Starting server...")
    yield


# 创建 FastAPI 应用
app = FastAPI(
    title="Claude Clone Backend",
    description="AI Chat backend powered by OpenCode Zen",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - 允许所有来源（本地部署，无鉴权）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(chat.router)            # SSE /api/chat/stream/{id}
app.include_router(conversations.router)   # /api/conversations
app.include_router(models.router)          # /api/models
app.include_router(sandbox.router)         # /api/sandbox/run


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok", "service": "claude-clone-backend"}


# 挂载前端静态文件（如果存在）
frontend_dist = Path(settings.FRONTEND_DIST)
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
    logger.info(f"Serving frontend from {frontend_dist}")
else:
    logger.warning(f"Frontend dist not found at {frontend_dist}, skipping static mount")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
