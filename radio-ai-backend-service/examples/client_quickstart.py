"""
radio-ai-backend-service 设备交互 Quickstart 示例
演示硬件设备 (或终端客户端) 如何向服务端发起 API 请求，拉取频道播放列表与进行语音打断测试。
"""

import sys
from pathlib import Path
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("🌐 [1/3] 检查服务健康状态...")
    try:
        r = httpx.get(f"{BASE_URL}/health")
        print(f"响应: {r.json()}")
    except Exception as e:
        print(f"❌ 无法连接到 backend-service: {e}，请确认 `python app/main.py` 已启动。")
        return

    # 2. 模拟玩偶开机拉取专属频道播放单
    doll_id = "MINI-LOTSO"
    print(f"\n🧸 [2/3] 玩偶 {doll_id} 开机拉取频道播放单...")
    r = httpx.get(f"{BASE_URL}/api/v1/device/dolls/{doll_id}/channels")
    data = r.json()
    print(f"玩偶名称: {data['doll_name']}")
    for ch in data['channels']:
        print(f" 频道名称: {ch['channel_name']} (节点数: {len(ch['playlist'])})")
        for item in ch['playlist'][:3]:
            print(f"  - [{item['type']}] {item['title']} (时长: {item['durationSeconds']}s)")

    # 3. 模拟播放中打断对话
    print(f"\n💬 [3/3] 模拟用户在播放中插话打断...")
    payload = {
        "doll_id": doll_id,
        "channel_id": "CH-LOTSO-01",
        "current_item_id": "news-1",
        "play_offset_seconds": 15,
        "user_text": "草莓熊，我也想去吃草莓冰淇淋！"
    }
    r = httpx.post(f"{BASE_URL}/api/v1/device/interruption/chat", json=payload)
    reply = r.json()
    print(f"玩偶回复正文: {reply['reply_text']}")
    print(f"建议后续动作: {reply['suggested_action']} (恢复 Offset: {reply['resume_offset_seconds']}s)")

if __name__ == "__main__":
    main()
