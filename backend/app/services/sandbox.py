"""
Docker 沙盒执行服务
- 每次执行启动新的隔离容器
- 资源限制: CPU 1核, 内存 512MB, 超时 30秒
- 网络禁用, 只读根文件系统
- Docker 不可用时返回明确错误
"""
import asyncio
import tempfile
import os
from pathlib import Path

from app.core.config import settings
from app.models.schemas import SandboxRunResult


async def _docker_available() -> bool:
    """检查 Docker 是否可用"""
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "info",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await asyncio.wait_for(proc.wait(), timeout=5.0)
        return proc.returncode == 0
    except (FileNotFoundError, asyncio.TimeoutError):
        return False


async def run_code(code: str, language: str = "python") -> SandboxRunResult:
    """
    在 Docker 沙盒中执行代码。
    
    执行命令:
      docker run --rm --network none --memory 512m --cpus 1 \
        --read-only --tmpfs /tmp:rw,size=64m \
        -v <code_file>:/app/code.py:ro \
        claude-sandbox python /app/code.py
    """
    # 检查沙盒是否启用
    if not settings.SANDBOX_ENABLED:
        return SandboxRunResult(
            stdout="",
            stderr="Sandbox is disabled (SANDBOX_ENABLED=false)",
            exit_code=1,
        )

    # 检查 Docker 可用性
    if not await _docker_available():
        return SandboxRunResult(
            stdout="",
            stderr="Docker is not available on this host. Please install Docker or enable the sandbox properly.",
            exit_code=1,
        )

    if language != "python":
        return SandboxRunResult(
            stdout="",
            stderr=f"Unsupported language: {language}. Only 'python' is supported.",
            exit_code=1,
        )

    # 将代码写入临时文件，挂载到容器中
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, encoding="utf-8"
    ) as f:
        f.write(code)
        code_path = f.name

    try:
        # 构建 docker run 命令
        cmd = [
            "docker", "run", "--rm",
            "--network", "none",
            "--memory", settings.SANDBOX_MEMORY,
            "--cpus", settings.SANDBOX_CPUS,
            "--read-only",
            "--tmpfs", "/tmp:rw,size=64m",
            "-v", f"{code_path}:/app/code.py:ro",
            settings.SANDBOX_IMAGE,
            "python", "/app/code.py",
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await asyncio.wait_for(
                proc.communicate(),
                timeout=settings.SANDBOX_TIMEOUT,
            )

            return SandboxRunResult(
                stdout=stdout.decode(errors="replace"),
                stderr=stderr.decode(errors="replace"),
                exit_code=proc.returncode or 0,
                timed_out=False,
            )

        except asyncio.TimeoutError:
            # 超时: 尝试杀掉容器
            try:
                # docker ps 找到运行中的容器并杀掉
                # 由于 --rm，杀掉后会自动清理
                kill_proc = await asyncio.create_subprocess_exec(
                    "docker", "ps", "-q", "--filter", f"ancestor={settings.SANDBOX_IMAGE}",
                    stdout=asyncio.subprocess.PIPE,
                )
                out, _ = await kill_proc.communicate()
                for cid in out.decode().strip().split("\n"):
                    if cid:
                        await asyncio.create_subprocess_exec(
                            "docker", "kill", cid.strip(),
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE,
                        )
            except Exception:
                pass

            return SandboxRunResult(
                stdout="",
                stderr=f"Execution timed out after {settings.SANDBOX_TIMEOUT} seconds.",
                exit_code=124,
                timed_out=True,
            )

    finally:
        # 清理临时文件
        try:
            os.unlink(code_path)
        except OSError:
            pass
