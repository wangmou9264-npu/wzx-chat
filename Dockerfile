# SnapDeploy 完整部署 Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/app/ ./app/

# 复制前端构建产物
COPY frontend/dist/ ./frontend/dist/

# 创建数据目录
RUN mkdir -p /app/data

# 环境变量
ENV HOST=0.0.0.0
ENV PORT=8000
ENV SANDBOX_ENABLED=false
ENV DATABASE_PATH=/app/data/claude.db
ENV FRONTEND_DIST=/app/frontend/dist

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
