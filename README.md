# Claude Clone

一个类似 Claude.ai 的 AI 对话网站，基于 OpenCode Zen 免费模型通道，无需账号，支持代码执行沙盒。

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.10+-green)
![React](https://img.shields.io/badge/react-18-blue)

## ✨ 特性

- 🤖 **免费模型** - 基于 OpenCode Zen 匿名通道，无需 API Key，支持 14+ 免费模型
- 💬 **流式对话** - 逐字输出，支持思考过程（reasoning）显示
- 🎨 **Claude 风格界面** - 简洁优雅，深色/浅色主题切换
- 🛡️ **代码沙盒** - Docker 容器隔离执行 Python 代码，安全可靠
- 📝 **对话管理** - 本地存储对话历史，支持创建/删除/重命名
- 🖼️ **图片输入** - 支持视觉模型的图片上传
- 🔓 **无需账号** - 任何人打开即用，无登录注册
- 🌐 **内网穿透** - 内置 Cloudflare Tunnel / frp / ngrok 方案
- 📱 **响应式设计** - 支持桌面和移动端

## 🚀 快速开始

### 前置要求
- Python 3.10+
- Node.js 18+
- Docker（可选，用于代码沙盒）

### 一键启动

```bash
git clone <this-repo>
cd claude-clone
chmod +x start.sh
./start.sh
```

访问 http://localhost:8000

### 手动启动

详见 [docs/DEPLOY.md](docs/DEPLOY.md)

## 🐳 Docker 部署

```bash
cd deploy
cp .env.example .env
docker-compose up -d --build
```

访问 http://localhost:3000

## 🌐 外网访问

无需公网 IP，使用 Cloudflare Tunnel 一键暴露到公网：

```bash
# 安装
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# 启动临时隧道
cloudflared tunnel --url http://localhost:8000
```

更多方案详见 [docs/TUNNEL.md](docs/TUNNEL.md)

## 🤖 可用模型

| 模型 ID | 名称 | 图片输入 |
|---------|------|---------|
| `space-bunny-free` | Space Bunny | ✅ |
| `big-pickle` | Big Pickle | ❌ |
| `longcat-2.5-preview-free` | LongCat 2.5 Preview | ❌ |
| `exo-free` | Exo | ❌ |
| `fledge-alpha-free` | Fledge Alpha | ❌ |
| `mimo-v2.6-flash-free` | MiMo v2.6 Flash | ✅ |
| `mimo-v2.5-free` | MiMo v2.5 | ❌ |
| `ling-3.1-flash-free` | Ling 3.1 Flash | ❌ |
| `ling-3.0-flash-fin-free` | Ling 3.0 Flash Fin | ❌ |
| `nemotron-3-ultra-free` | Nemotron 3 Ultra | ❌ |
| `nemotron-3.5-lightning-free` | Nemotron 3.5 Lightning | ❌ |
| `muse-spark-1.3-contributor-free` | Muse Spark 1.3 | ❌ |
| `muse-spark-1.2-contributor-free` | Muse Spark 1.2 | ❌ |
| `deepseek-v4-flash-free` | DeepSeek v4 Flash | ❌ |

> 模型列表会从 OpenCode API 动态获取，以上为截至 2026-10 的免费模型。

## 🏗️ 技术架构

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   React 前端    │ ◄────────────────► │  FastAPI 后端   │
│  (Claude 风格)  │                    │                 │
└─────────────────┘                    │  ┌───────────┐  │
                                       │  │ OpenCode  │  │
                                       │  │ API 封装  │  │
                                       │  └───────────┘  │
                                       │  ┌───────────┐  │
                                       │  │ Docker    │  │
                                       │  │ 沙盒      │  │
                                       │  └───────────┘  │
                                       │  ┌───────────┐  │
                                       │  │ SQLite    │  │
                                       │  │ 存储      │  │
                                       │  └───────────┘  │
                                       └─────────────────┘
```

## 📁 项目结构

```
claude-clone/
├── backend/              # Python FastAPI 后端
│   ├── app/
│   │   ├── main.py       # 入口
│   │   ├── api/          # API路由
│   │   ├── core/         # 配置、数据库
│   │   ├── services/     # OpenCode封装、沙盒
│   │   └── models/       # 数据模型
│   ├── sandbox/          # 沙盒Docker镜像
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/             # React 前端
│   ├── src/
│   │   ├── components/   # UI组件
│   │   ├── hooks/        # React Hooks
│   │   ├── lib/          # 工具函数
│   │   ├── types/        # TypeScript类型
│   │   └── styles/       # 全局样式
│   ├── package.json
│   └── Dockerfile
├── deploy/               # 部署配置
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── .env.example
├── docs/                 # 文档
│   ├── DEPLOY.md         # 部署指南
│   ├── TUNNEL.md         # 内网穿透
│   └── SANDBOX.md        # 沙盒说明
├── start.sh              # 一键启动脚本
└── ARCHITECTURE.md       # 架构设计
```

## ⚙️ 配置

通过环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8000` | 服务端口 |
| `DATABASE_PATH` | `./claude.db` | 数据库路径 |
| `SANDBOX_ENABLED` | `true` | 启用代码沙盒 |
| `SANDBOX_TIMEOUT` | `30` | 沙盒超时(秒) |
| `SANDBOX_MEMORY` | `512m` | 沙盒内存限制 |

## 🛡️ 安全说明

- 代码在 Docker 容器中执行，网络禁用，文件系统只读
- 无账号系统，对话数据存储在本地 SQLite
- 公网部署建议添加访问认证（详见 TUNNEL.md）
- OpenCode 匿名通道有 IP 速率限制

## 📄 许可证

MIT License

## 🙏 致谢

- [OpenCode](https://opencode.ai) - 提供免费模型通道
- [opencode2dsh](https://github.com/FishBottle7/opencode2dsh) - 匿名通道实现参考
- [Claude.ai](https://claude.ai) - 界面设计灵感
