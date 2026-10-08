# 代码沙盒说明

## 概述

本项目实现了基于Docker容器的代码执行沙盒，用于安全地执行AI生成的Python代码。

## 安全机制

### 1. 容器隔离
每次代码执行都在一个全新的Docker容器中运行，执行完毕后容器立即销毁：
- `--rm`: 容器退出后自动删除
- `--network none`: 禁用网络，防止代码访问外网或内网
- `--read-only`: 根文件系统只读
- `--tmpfs /tmp`: 仅/tmp可写，且限制大小64MB
- `--memory 512m`: 内存限制512MB
- `--cpus 1`: CPU限制1核
- `-v code.py:/app/code.py:ro`: 代码文件只读挂载

### 2. 超时控制
- 默认超时30秒
- 超时后强制终止容器（SIGKILL）
- 防止无限循环或死锁

### 3. 资源限制
- 内存: 512MB（OOM时容器被kill）
- CPU: 1核
- 磁盘: 仅/tmp可写，64MB上限
- 进程数: 受cgroup限制

### 4. 无网络访问
容器使用 `--network none`，代码无法：
- 访问外部API
- 下载恶意payload
- 扫描内网
- 建立反向shell

## 沙盒环境

### 基础镜像
```dockerfile
FROM python:3.11-slim

# 预装常用科学计算库
RUN pip install --no-cache-dir numpy pandas requests matplotlib
```

### 可用库
- Python标准库
- numpy: 数值计算
- pandas: 数据分析
- requests: HTTP请求（但网络被禁用，实际无法使用）
- matplotlib: 绘图（无法显示，但可以保存文件到/tmp）

### 限制
- 无法安装新包（无网络）
- 无法访问文件系统（除/tmp外只读）
- 无法创建子进程访问网络
- 无法访问Docker socket

## 使用方式

### API调用

```bash
curl -X POST http://localhost:8000/api/sandbox/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, World!\")\nimport numpy as np\nprint(np.array([1,2,3]).sum())",
    "language": "python"
  }'
```

### 响应格式

```json
{
  "stdout": "Hello, World!\n6\n",
  "stderr": "",
  "exit_code": 0,
  "duration_ms": 1234
}
```

### 错误情况

**超时**:
```json
{
  "stdout": "",
  "stderr": "",
  "exit_code": -1,
  "error": "Execution timed out after 30 seconds"
}
```

**运行时错误**:
```json
{
  "stdout": "",
  "stderr": "Traceback (most recent call last):\n  File \"/app/code.py\", line 1, in <module>\n    import nonexistent\nModuleNotFoundError: No module named 'nonexistent'\n",
  "exit_code": 1
}
```

## 前端集成

在聊天界面中，AI回复的Python代码块右上角会显示"运行"按钮。点击后：
1. 代码发送到后端沙盒API
2. 执行结果显示在代码块下方
3. stdout显示为绿色文字，stderr显示为红色文字
4. 运行中显示loading状态

## 构建沙盒镜像

```bash
cd backend/sandbox
docker build -t claude-sandbox .
```

## 禁用沙盒

如果不需要代码执行功能，可以通过环境变量禁用：

```bash
export SANDBOX_ENABLED=false
```

禁用后，前端代码块的"运行"按钮会隐藏，API返回503错误。

## 安全建议

### 公网部署时
1. **强烈建议添加访问认证**（Nginx basic auth或其他方式）
2. 降低沙盒资源限制（内存256MB，超时15秒）
3. 限制沙盒并发数（防止DoS）
4. 定期清理Docker残留容器和镜像
5. 考虑在虚拟机中运行整个服务

### 监控
```bash
# 查看运行中的沙盒容器
docker ps --filter ancestor=claude-sandbox

# 查看Docker资源使用
docker stats

# 清理残留容器
docker container prune -f
```

## 扩展沙盒

### 添加更多语言支持
目前仅支持Python。要添加其他语言：
1. 在 `backend/sandbox/` 创建对应语言的Dockerfile
2. 在 `app/services/sandbox.py` 中添加语言判断和执行命令
3. 前端CodeBlock组件中添加对应语言的运行按钮

### 自定义沙盒镜像
编辑 `backend/sandbox/Dockerfile`，添加需要的库：

```dockerfile
FROM python:3.11-slim
RUN pip install --no-cache-dir numpy pandas requests matplotlib scipy scikit-learn
```

然后重新构建：`docker build -t claude-sandbox .`
