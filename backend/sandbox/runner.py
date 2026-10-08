"""
沙盒内执行脚本 - 由 Docker 容器调用
接收代码文件路径，执行并捕获 stdout/stderr/exit_code
"""
import sys
import traceback


def main():
    """执行 /app/code.py 中的代码"""
    code_file = "/app/code.py"

    try:
        with open(code_file, "r", encoding="utf-8") as f:
            code = f.read()

        # 在独立命名空间中执行代码
        namespace = {"__name__": "__main__", "__file__": code_file}
        exec(compile(code, code_file, "exec"), namespace)

    except Exception:
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
