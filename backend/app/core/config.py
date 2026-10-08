"""
应用配置模块 - 从环境变量读取所有配置项
"""
import os
from pathlib import Path


# 项目根目录（backend/）
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings:
    """应用配置，优先从环境变量读取，使用合理默认值"""

    def __init__(self):
        # 服务监听
        self.HOST: str = os.getenv("HOST", "0.0.0.0")
        self.PORT: int = int(os.getenv("PORT", "8000"))

        # SQLite 数据库路径
        self.DATABASE_PATH: str = os.getenv(
            "DATABASE_PATH", str(BASE_DIR / "data" / "app.db")
        )

        # 沙盒配置
        self.SANDBOX_ENABLED: bool = os.getenv("SANDBOX_ENABLED", "true").lower() == "true"
        self.SANDBOX_IMAGE: str = os.getenv("SANDBOX_IMAGE", "claude-sandbox:latest")
        self.SANDBOX_TIMEOUT: int = int(os.getenv("SANDBOX_TIMEOUT", "30"))
        self.SANDBOX_MEMORY: str = os.getenv("SANDBOX_MEMORY", "512m")
        self.SANDBOX_CPUS: str = os.getenv("SANDBOX_CPUS", "1")

        # OpenCode API
        self.OPENCODE_BASE_URL: str = os.getenv(
            "OPENCODE_BASE_URL", "https://opencode.ai/zen/v1"
        )
        self.OPENCODE_API_KEY: str = os.getenv("OPENCODE_API_KEY", "public")
        self.OPENCODE_TIMEOUT: float = float(os.getenv("OPENCODE_TIMEOUT", "60"))

        # 前端静态文件目录（相对 backend/ 的路径）
        self.FRONTEND_DIST: str = os.getenv(
            "FRONTEND_DIST", str(BASE_DIR.parent / "frontend" / "dist")
        )


settings = Settings()

# 确保数据库目录存在
Path(settings.DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)
