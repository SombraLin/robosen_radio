"""
radio-ai-data 使用示例
演示如何独立使用数据 SDK 初始化数据库并增删改查玩偶及新闻。
"""

import os
import sys
from pathlib import Path

# 将模块路径加入 sys.path 以保证免安装直接可运行
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from radio_ai_data import (
    init_database,
    DollRepository,
    NewsRepository,
    get_generative_config,
)

def main():
    print("🚀 开始初始化数据库测试...")
    db_file = Path("./data/test_radio_ai.db")
    os.environ["RADIO_AI_DATABASE_PATH"] = str(db_file.resolve())

    # 1. 初始化数据库及种子数据
    init_database()
    print("✅ 数据库成功初始化与 Seed 填充。")

    # 2. 查询默认玩偶
    dolls = DollRepository.get_all_dolls()
    print(f"当前库中玩偶主播数量: {len(dolls)}")
    for d in dolls:
        print(f" - [{d['doll_id']}] {d['name']} (频道数: {len(d['channels'])})")

    # 3. 获取生成式全局配置
    config = get_generative_config()
    print(f"默认 LLM Provider: {config['default_llm_provider']}")
    print(f"默认 TTS Voice ID: {config['default_voice_id']}")

if __name__ == "__main__":
    main()
