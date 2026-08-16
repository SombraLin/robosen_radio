"""
radio-ai-engine 使用示例
演示如何独立调用 AI 稿件生成与 TTS 语音合成能力。
"""

import asyncio
import sys
from pathlib import Path

# 将模块路径加入 sys.path 以保证免安装直接可运行
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from radio_ai_engine import generate_script, synthesize

async def main():
    print("🤖 [1/2] 正在生成新闻播报稿 (Local/Mock 模式示例)...")
    
    script = await generate_script(
        title="AI 虚拟玩偶交互取得突破性进展",
        source="RADIO-AI 实验室",
        summary="最新发布的实体玩偶芯片实现了低延迟打断对话与多角色连线，为家庭陪伴带来新体验。",
        published_at="2026-08-09",
        llm_provider="local" # 使用 local 规则转换测试
    )
    print(f"生成的稿件正文:\n{script}\n")

    print("🎙️ [2/2] 正在合成语音文件 (Local Sine Wave 演示模式)...")
    output_dir = Path("./output")
    output_stem = output_dir / "sample_audio"

    audio_path, duration, size = await synthesize(
        text=script,
        voice_id="demo-voice",
        output_stem=output_stem,
        tts_provider="local" # 使用本地正弦波模拟合成
    )

    print(f"✅ 音频合成成功!")
    print(f" 文件路径: {audio_path.resolve()}")
    print(f" 预计时长: {duration} 秒")
    print(f" 文件大小: {size} 字节")

if __name__ == "__main__":
    asyncio.run(main())
