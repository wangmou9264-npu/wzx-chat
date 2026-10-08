# 部署指南

## 快速开始（本地开发）

### 前置要求
- Python 3.10+
- Node.js 18+
- Docker（可选，用于代码沙盒）

### 一键启动

```bash
chmod +x start.sh
./start.sh
```

启动后访问 http://localhost:8000

### 手动启动

#### 1. 后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 构建沙盒镜像（可选）
cd sandbox && docker build -t claude-sandbox . && cd ..

# 启动
export DATABASE_PATH=./data/claude.db
export SANDBOX_ENABLED=true
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. 前端（开发模式）

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173 （Vite开发服务器，API自动代理到后端）

## Docker 部署

### 使用 docker-compose

```bash
cd deploy

# 复制环境变量配置
cp .env.example .env

# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

访问 http://localhost:3000 （nginx反代前端+后端）

### 单独构建镜像

```bash
# 后端镜像
cd backend
docker build -t claude-clone-backend .

# 前端镜像
cd frontend
docker build -t claude-clone-frontend .

# 沙盒镜像
cd backend/sandbox
docker build -t claude-sandbox .
```

### 运行后端容器

```bash
docker run -d \
  --name claude-backend \
  -p 8000:8000 \
  -v $(pwd)/data:/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e DATABASE_PATH=/data/claude.db \
  -e SANDBOX_ENABLED=true \
  claude-clone-backend
```

**注意**: 挂载 `/var/run/docker.sock` 是为了让后端容器能启动沙盒容器。这有一定安全风险，仅在可信环境使用。

## 生产环境部署建议

### 1. 使用 systemd 管理后端服务

```ini
# /etc/systemd/system/claude-clone.service
[Unit]
Description=Claude Clone AI Chat
After=network.target docker.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/claude-clone/backend
Environment="PATH=/opt/claude-clone/backend/venv/bin"
Environment="DATABASE_PATH=/opt/claude-clone/data/claude.db"
Environment="SANDBOX_ENABLED=true"
ExecStart=/opt/claude-clone/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable claude-clone
sudo systemctl start claude-clone
```

### 2. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name chat.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

### 3. HTTPS（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d chat.yourdomain.com
```

### 4. 日志轮转

```conf
# /etc/logrotate.d/claude-clone
/var/log/claude-clone/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

## 配置项说明

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `8000` | 监听端口 |
| `DATABASE_PATH` | `./claude.db` | SQLite数据库路径 |
| `SANDBOX_ENABLED` | `true` | 是否启用代码沙盒 |
| `SANDBOX_IMAGE` | `claude-sandbox` | 沙盒Docker镜像名 |
| `SANDBOX_TIMEOUT` | `30` | 沙盒执行超时（秒） |
| `SANDBOX_MEMORY` | `512m` | 沙盒内存限制 |
| `SANDBOX_CPU` | `1` | 沙盒CPU核心限制 |

## 常见问题

### Q: 模型调用失败，显示401或403
A: OpenCode匿名通道可能有IP速率限制。等待几分钟后重试，或更换网络环境。

### Q: 沙盒功能不可用
A: 确保Docker已安装并运行，且沙盒镜像已构建：`cd backend/sandbox && docker build -t claude-sandbox .`

### Q: 对话历史丢失
A: 检查 `DATABASE_PATH` 路径是否有写入权限。Docker部署时确保volume挂载正确。

### Q: 外网无法访问
A: 参考 `docs/TUNNEL.md` 配置内网穿透。确保防火墙开放对应端口。

### Q: 图片上传不工作
A: 仅 `space-bunny-free` 和 `mimo-v2.6-flash-free` 等少数免费模型支持图片输入，其他模型会忽略图片。
