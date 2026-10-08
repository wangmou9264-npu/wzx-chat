# 内网穿透配置指南

本项目提供三种内网穿透方案，按推荐程度排序：

## 方案一：Cloudflare Tunnel（推荐，免费，无需公网IP）

Cloudflare Tunnel 是最简单的方案，不需要公网IP、不需要路由器配置、自带HTTPS。

### 前置条件
- 一个域名（可以在Cloudflare托管，也可以用免费的 `.trycloudflare.com` 子域名）
- Cloudflare 账号（免费）

### 快速开始（临时隧道，无需域名）

```bash
# 安装 cloudflared
# Linux (amd64)
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# macOS
brew install cloudflared

# Windows
# 下载 https://github.com/cloudflare/cloudflared/releases

# 启动临时隧道（会自动生成一个 trycloudflare.com 域名）
cloudflared tunnel --url http://localhost:8000
```

启动后终端会显示类似 `https://random-words.trycloudflare.com` 的URL，这就是你的公网访问地址。

### 永久隧道（绑定自己的域名）

```bash
# 1. 登录Cloudflare
cloudflared tunnel login

# 2. 创建隧道
cloudflared tunnel create claude-clone

# 3. 配置DNS（将域名指向隧道）
cloudflared tunnel route dns claude-clone chat.yourdomain.com

# 4. 创建配置文件 ~/.cloudflared/config.yml
cat > ~/.cloudflared/config.yml << EOF
tunnel: <你的隧道ID>
credentials-file: /root/.cloudflared/<隧道ID>.json

ingress:
  - hostname: chat.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
EOF

# 5. 启动隧道
cloudflared tunnel run claude-clone
```

### 作为系统服务运行

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## 方案二：frp（需要一台有公网IP的服务器）

frp 是高性能的反向代理，适合有自己VPS的用户。

### 服务端（公网VPS）配置

```ini
# frps.toml
bindPort = 7000
vhostHTTPPort = 80
vhostHTTPSPort = 443

# 可选：仪表盘
webServer.addr = "0.0.0.0"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "yourpassword"

# 可选：token认证
auth.method = "token"
auth.token = "your-secret-token"
```

```bash
# 下载frp
wget https://github.com/fatedier/frp/releases/download/v0.58.1/frp_0.58.1_linux_amd64.tar.gz
tar xzf frp_0.58.1_linux_amd64.tar.gz
cd frp_0.58.1_linux_amd64

# 启动服务端
./frps -c frps.toml
```

### 客户端（本地机器）配置

```ini
# frpc.toml
serverAddr = "你的VPS_IP"
serverPort = 7000
auth.method = "token"
auth.token = "your-secret-token"

[[proxies]]
name = "claude-clone"
type = "http"
localPort = 8000
customDomains = ["chat.yourdomain.com"]

# 如果没有域名，可以用TCP模式
# [[proxies]]
# name = "claude-clone-tcp"
# type = "tcp"
# localPort = 8000
# remotePort = 8080
```

```bash
./frpc -c frpc.toml
```

### Nginx反代（VPS端，可选，用于HTTPS）

```nginx
server {
    listen 80;
    server_name chat.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # WebSocket支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
}
```

---

## 方案三：ngrok（最简单，但免费版有流量限制）

```bash
# 安装
# macOS
brew install ngrok/ngrok/ngrok

# Linux
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# 注册并配置authtoken（免费注册 https://ngrok.com）
ngrok config add-authtoken YOUR_AUTHTOKEN

# 启动
ngrok http 8000
```

启动后会显示 `https://xxxx.ngrok-free.app`，这就是公网地址。

**注意**：免费版ngrok每次重启URL会变，且有流量和连接数限制。

---

## 方案对比

| 特性 | Cloudflare Tunnel | frp | ngrok |
|------|------------------|-----|-------|
| 费用 | 免费 | 需VPS（约$5/月） | 免费版有限制 |
| 需要公网IP | 否 | 是 | 否 |
| 需要域名 | 可选 | 可选 | 不需要 |
| HTTPS | 自动 | 需配置 | 自动 |
| 速度 | 快（Cloudflare CDN） | 取决于VPS | 中等 |
| 稳定性 | 高 | 高 | 免费版一般 |
| 自定义域名 | 支持 | 支持 | 付费版 |

## 安全建议

1. **不要直接暴露8000端口到公网**，始终通过隧道或反向代理
2. 如果使用frp，务必设置token认证
3. 建议配置HTTPS（Cloudflare Tunnel自动提供）
4. 沙盒功能在公网访问时存在风险，建议：
   - 限制沙盒并发数
   - 设置更严格的资源限制
   - 考虑添加简单的访问密码（Nginx basic auth）

### Nginx Basic Auth 配置

```bash
# 安装htpasswd
sudo apt install apache2-utils

# 创建密码文件
sudo htpasswd -c /etc/nginx/.htpasswd yourusername

# Nginx配置中添加
location / {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
    # ... 其他proxy配置
}
```
