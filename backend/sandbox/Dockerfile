# 沙盒执行镜像 - 基于 python:3.11-slim，预装常用数据科学库
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 设置 pip 镜像加速（国内环境）
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple \
    || true

# 预装常用库
RUN pip install --no-cache-dir \
    numpy \
    pandas \
    requests \
    matplotlib \
    pillow

# 创建非 root 用户运行代码
RUN useradd -m -u 1000 sandbox

# 切换到非 root 用户
USER sandbox

# 默认入口
CMD ["python", "/app/code.py"]
