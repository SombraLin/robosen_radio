#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Radio AI 自动部署与启动脚本 ===${NC}"

# 1. 检查 Redis
if ! command -v redis-cli &> /dev/null; then
    if command -v docker &> /dev/null; then
        echo -e "${YELLOW}未检测到本地 Redis，尝试使用 Docker 启动 Redis...${NC}"
        docker start redis-server 2>/dev/null || docker run -d --name redis-server -p 6379:6379 redis:alpine
    else
        echo -e "${RED}未检测到 Redis 且未检测到 Docker，请先安装 redis-server！${NC}"
        exit 1
    fi
else
    if ! redis-cli ping &> /dev/null; then
        echo -e "${YELLOW}尝试启动 redis-server...${NC}"
        redis-server --daemonize yes
    fi
fi

# 2. 准备虚拟环境
if [ ! -d ".venv" ]; then
    echo -e "${GREEN}创建虚拟环境 .venv...${NC}"
    python3 -m venv .venv
fi
source .venv/bin/activate

# 3. 安装依赖
echo -e "${GREEN}安装基础依赖包...${NC}"
pip install --upgrade pip
pip install -e ./radio-ai-data
pip install -e ./radio-ai-engine
pip install -r ./radio-ai-backend-service/requirements.txt
pip install -r ./radio-ai-tts/requirements.txt
pip install -e ./radio-ai-crawler

# 4. 创建日志目录
mkdir -p logs

PIDS=()

cleanup() {
    echo -e "\n${RED}正在停止所有服务...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${GREEN}启动后端微服务...${NC}"
cd "$DIR/radio-ai-backend-service"
export PYTHONPATH="$DIR/radio-ai-backend-service"
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > "$DIR/logs/backend.log" 2>&1 &
PIDS+=($!)

echo -e "${GREEN}启动 TTS API...${NC}"
cd "$DIR/radio-ai-tts"
export PYTHONPATH="$DIR/radio-ai-tts"
nohup uvicorn app.main:app --host 0.0.0.0 --port 8018 > "$DIR/logs/tts_api.log" 2>&1 &
PIDS+=($!)

echo -e "${GREEN}启动 TTS Celery Worker...${NC}"
cd "$DIR/radio-ai-tts"
nohup celery -A app.celery_app worker --loglevel=info -Q tts_queue > "$DIR/logs/tts_worker.log" 2>&1 &
PIDS+=($!)

echo -e "${GREEN}启动 Crawler Celery Worker...${NC}"
cd "$DIR/radio-ai-crawler"
export PYTHONPATH="$DIR/radio-ai-crawler"
nohup celery -A radio_ai_crawler.celery_app worker --loglevel=info -Q crawler_queue > "$DIR/logs/crawler_worker.log" 2>&1 &
PIDS+=($!)

echo -e "${GREEN}启动前端控制台...${NC}"
cd "$DIR/radio-ai-admin-console"
if [ ! -d "node_modules" ]; then
    npm install
fi
nohup npm run dev > "$DIR/logs/frontend.log" 2>&1 &
PIDS+=($!)

echo -e "${GREEN}所有服务启动完毕！${NC}"
echo -e "您可以查看 $DIR/logs/ 目录下的日志文件。"
echo -e "后端 API: http://localhost:8000"
echo -e "TTS  API: http://localhost:8018"
echo -e "前端控制台: 运行在上方日志中提示的端口 (通常是 http://localhost:5173)"
echo ""
echo -e "${YELLOW}当前脚本正在前台挂起以保持服务运行。按 Ctrl+C 可以一键停止所有服务并退出。${NC}"

wait
