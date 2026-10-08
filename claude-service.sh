#!/bin/bash
# Claude Clone 服务管理脚本
# 用法: ./claude-service.sh {start|stop|restart|status|tunnel-url}

PROJECT_DIR="/home/user/Doubao/chats/38445862531182338/claude-clone"
BACKEND_DIR="$PROJECT_DIR/backend"
PORT=8000
SERVER_LOG="/tmp/claude_server.log"
TUNNEL_LOG="/tmp/cloudflared.log"
CLOUDFLARED="$PROJECT_DIR/cloudflared"

case "$1" in
    start)
        echo "启动 Claude Clone 服务..."
        
        # 启动后端
        cd "$BACKEND_DIR"
        source venv/bin/activate
        HOST=0.0.0.0 PORT=$PORT DATABASE_PATH="$PROJECT_DIR/data/claude.db" SANDBOX_ENABLED=false \
            nohup uvicorn app.main:app --host 0.0.0.0 --port $PORT > "$SERVER_LOG" 2>&1 &
        echo "  后端 PID: $!"
        
        sleep 3
        
        # 启动内网穿透
        if [ -x "$CLOUDFLARED" ]; then
            nohup "$CLOUDFLARED" tunnel --url http://localhost:$PORT --no-autoupdate > "$TUNNEL_LOG" 2>&1 &
            echo "  隧道 PID: $!"
            sleep 8
            URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1)
            echo "  公网地址: $URL"
        else
            echo "  警告: cloudflared 未找到，跳过隧道启动"
            echo "  本地地址: http://localhost:$PORT"
        fi
        
        echo "✅ 服务启动完成"
        ;;
    
    stop)
        echo "停止 Claude Clone 服务..."
        pkill -f "uvicorn app.main:app" 2>/dev/null && echo "  后端已停止" || echo "  后端未运行"
        pkill -f "cloudflared tunnel" 2>/dev/null && echo "  隧道已停止" || echo "  隧道未运行"
        echo "✅ 服务已停止"
        ;;
    
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    
    status)
        if pgrep -f "uvicorn app.main:app" > /dev/null; then
            echo "✅ 后端运行中 (PID: $(pgrep -f 'uvicorn app.main:app' | head -1))"
        else
            echo "❌ 后端未运行"
        fi
        if pgrep -f "cloudflared tunnel" > /dev/null; then
            echo "✅ 隧道运行中 (PID: $(pgrep -f 'cloudflared tunnel' | head -1))"
            URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1)
            [ -n "$URL" ] && echo "   公网地址: $URL"
        else
            echo "❌ 隧道未运行"
        fi
        echo "   本地地址: http://localhost:$PORT"
        ;;
    
    tunnel-url)
        URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1)
        if [ -n "$URL" ]; then
            echo "$URL"
        else
            echo "未找到隧道地址，请确认隧道已启动"
            exit 1
        fi
        ;;
    
    *)
        echo "用法: $0 {start|stop|restart|status|tunnel-url}"
        exit 1
        ;;
esac
