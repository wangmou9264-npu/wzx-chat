"""
代码沙盒执行 REST API
- POST /api/sandbox/run - 执行代码
"""
from fastapi import APIRouter

from app.models.schemas import SandboxRunRequest
from app.services.sandbox import run_code

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])


@router.post("/run")
async def sandbox_run(body: SandboxRunRequest):
    """在 Docker 沙盒中执行代码"""
    result = await run_code(code=body.code, language=body.language)
    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "exit_code": result.exit_code,
        "timed_out": result.timed_out,
    }
