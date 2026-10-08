# Claude Clone - 架构设计文档

## 项目概述
一个类似Claude.ai的AI对话网站，基于OpenCode Zen匿名免费模型通道，无需账号，支持代码执行沙盒。

## 模型来源
- **API端点**: `https://opencode.ai/zen/v1/chat/completions`
- **认证**: `Authorization: Bearer public`（匿名免费通道）
- **伪装头**（必须，模拟OpenCode CLI）:
  - `user-agent: opencode/0.1.0`
  - `x-opencode-client: web`
  - `x-opencode-session: <sha256(conversation_id)>`
  - `X-Session-Id: <sha256(conversation_id)>`
  - `x-opencode-request: <uuid>`
  - `x-opencode-project: default`
- **流式**: SSE `stream: true`，支持 `reasoning_content`（思考过程）和 `content`（输出）
- **免费模型列表**:
  - `space-bunny-free`（支持图片输入）
  - `big-pickle`
  - `longcat-2.5-preview-free`
  - `exo-free`
  - `fledge-alpha-free`
  - `mimo-v2.6-flash-free`（支持图片输入）
  - `mimo-v2.5-free`
  - `ling-3.1-flash-free`
  - `ling-3.0-flash-fin-free`
  - `nemotron-3-ultra-free`
  - `nemotron-3.5-lightning-free`
  - `muse-spark-1.3-contributor-free`
  - `muse-spark-1.2-contributor-free`
  - `deepseek-v4-flash-free`

## 技术栈
- **前端**: React 18 + Vite + TailwindCSS + react-markdown + highlight.js
- **后端**: Python 3.11 + FastAPI + httpx（异步流式） + SQLite
- **沙盒**: Docker容器隔离执行Python代码
- **部署**: docker-compose + nginx反代
- **内网穿透**: frp / cloudflare tunnel 双方案

## 目录结构
```
claude-clone/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI入口
│   │   ├── core/
│   │   │   ├── config.py        # 配置
│   │   │   └── database.py      # SQLite
│   │   ├── api/
│   │   │   ├── chat.py          # 对话WebSocket/REST
│   │   │   ├── conversations.py # 对话管理
│   │   │   ├── models.py        # 模型列表
│   │   │   └── sandbox.py       # 代码执行
│   │   ├── services/
│   │   │   ├── opencode.py      # OpenCode API封装
│   │   │   └── sandbox.py       # Docker沙盒管理
│   │   └── models/
│   │       └── schemas.py       # Pydantic模型
│   ├── sandbox/
│   │   ├── Dockerfile           # 沙盒镜像
│   │   └── runner.py            # 沙盒内执行脚本
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # UI组件
│   │   ├── pages/               # 页面
│   │   ├── hooks/               # React hooks
│   │   ├── lib/                 # 工具函数
│   │   ├── types/               # TypeScript类型
│   │   └── styles/              # 全局样式
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── deploy/
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── .env.example
├── docs/
│   ├── DEPLOY.md                # 部署文档
│   ├── TUNNEL.md                # 内网穿透文档
│   └── SANDBOX.md               # 沙盒说明
└── start.sh                     # 一键启动脚本
```

## API设计
### WebSocket: `/ws/chat/{conversation_id}`
- 客户端发送: `{type: "message", content: "...", model: "...", images?: [...]}`
- 服务端推送:
  - `{type: "thinking", content: "..."}` （推理过程）
  - `{type: "token", content: "..."}` （输出token）
  - `{type: "tool_call", name: "...", args: {...}}` （工具调用）
  - `{type: "tool_result", name: "...", result: "..."}`
  - `{type: "done", usage: {...}}`
  - `{type: "error", message: "..."}`

### REST:
- `GET /api/models` - 获取可用模型列表
- `GET /api/conversations` - 对话列表
- `POST /api/conversations` - 创建对话
- `GET /api/conversations/{id}` - 对话详情
- `DELETE /api/conversations/{id}` - 删除对话
- `POST /api/sandbox/run` - 执行代码 `{code: "...", language: "python"}`

## 沙盒设计
- 每次代码执行启动一个新的Docker容器
- 镜像: python:3.11-slim，预装常用库（numpy, pandas, requests等）
- 资源限制: CPU 1核, 内存 512MB, 超时 30秒
- 网络: 禁用（--network none）
- 文件系统: 只读根文件系统，临时可写 /tmp
- 执行结果: stdout + stderr + exit_code

## Claude风格UI规范
- 左侧边栏: 对话列表（可折叠），新建对话按钮，模型选择器，主题切换
- 主区域: 消息流（用户消息右对齐浅色，AI消息左对齐），底部输入框
- 支持: Markdown渲染、代码高亮、代码块复制/运行按钮、思考过程折叠
- 主题: 深色（默认）/浅色切换，Claude经典配色（#D97757橙色强调）
- 字体: 系统无衬线，代码用等宽字体
- 响应式: 移动端侧边栏抽屉式
