#!/bin/bash
# Claude Clone 一键启动脚本
# 用法: ./start.sh [--no-sandbox] [--port 8000]

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
PORT=8000
NO_SANDBOX=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-sandbox)
            NO_SANDBOX=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        *)
            echo "未知参数: $1"
            echo "用法: $0 [--no-sandbox] [--port PORT]"
            exit 1
            ;;
    esac
done

echo "========================================="
echo "  Claude Clone - 启动脚本"
echo "========================================="
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 python3，请先安装 Python 3.10+"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 node，请先安装 Node.js 18+"
    exit 1
fi

# 检查Docker（沙盒需要）
DOCKER_AVAILABLE=false
if command -v docker &> /dev/null && docker info &> /dev/null; then
    DOCKER_AVAILABLE=true
    echo "✅ Docker 可用"
else
    if [ "$NO_SANDBOX" = false ]; then
        echo "⚠️  Docker 不可用，沙盒功能将被禁用"
        echo "   安装Docker后可启用代码执行功能"
        NO_SANDBOX=true
    fi
fi

echo ""
echo "📦 安装后端依赖..."
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
echo "✅ 后端依赖安装完成"

echo ""
echo "📦 安装前端依赖..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "✅ 前端依赖安装完成"

echo ""
echo "🔨 构建前端..."
npm run build
echo "✅ 前端构建完成"

# 构建沙盒镜像
if [ "$NO_SANDBOX" = false ] && [ "$DOCKER_AVAILABLE" = true ]; then
    echo ""
    echo "🔨 构建沙盒Docker镜像..."
    cd "$BACKEND_DIR/sandbox"
    docker build -t claude-sandbox . 2>/dev/null || echo "⚠️  沙盒镜像构建失败，沙盒将不可用"
    echo "✅ 沙盒镜像构建完成"
fi

echo ""
echo "🚀 启动服务..."
echo "   地址: http://localhost:$PORT"
echo "   沙盒: $([ "$NO_SANDBOX" = false ] && echo "已启用" || echo "已禁用")"
echo ""
echo "按 Ctrl+C 停止服务"
echo "========================================="
echo ""

cd "$BACKEND_DIR"
source venv/bin/activate

export HOST="0.0.0.0"
export PORT="$PORT"
export DATABASE_PATH="$PROJECT_DIR/data/claude.db"
export SANDBOX_ENABLED="$([ "$NO_SANDBOX" = false ] && echo "true" || echo "false")"

# 创建数据目录
mkdir -p "$PROJECT_DIR/data"

exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
