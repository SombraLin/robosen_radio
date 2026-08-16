#!/bin/bash
set -e

# Change to the directory of the script
cd "$(dirname "$0")"

PID_FILE="tts_service.pid"

if [ -f "$PID_FILE" ]; then
    if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo "TTS service is already running (PID: $(cat $PID_FILE))."
        exit 1
    else
        echo "Found stale PID file. Cleaning up."
        rm "$PID_FILE"
    fi
fi

echo "Starting Radio AI TTS service..."
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi
nohup uvicorn app.main:app --host 0.0.0.0 --port 8018 > tts_service.log 2>&1 &
PID=$!
echo $PID > "$PID_FILE"
echo "TTS service started with PID: $PID"
echo "Log file: tts_service.log"
