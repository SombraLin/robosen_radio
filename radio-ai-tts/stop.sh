#!/bin/bash
set -e

# Change to the directory of the script
cd "$(dirname "$0")"

PID_FILE="tts_service.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "TTS service is not running (no PID file found)."
    exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 $PID 2>/dev/null; then
    echo "Stopping TTS service (PID: $PID)..."
    kill $PID
    rm "$PID_FILE"
    echo "Service stopped."
else
    echo "TTS service is not running, but PID file exists. Cleaning up."
    rm "$PID_FILE"
fi
