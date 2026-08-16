# RADIO AI Engine (AI 稿件与 TTS 合成 SDK)

本工程是 RADIO AI 玩偶互动频道平台的**新闻口语化改写、玩偶人设生成与多引擎 TTS 语音合成独立 SDK**。

## 📦 核心功能

- **LLM 播报稿生成 (`generate_script`)**：支持阿里百炼 Qwen-Plus 播报稿改写、人设 Prompt 约束、以及纯本地规则后备。
- **多引擎语音合成 (`synthesize`)**：
  - **Edge-TTS**：微软免密发音人支持（晓晓、云希等）。
  - **CosyVoice / 阿里百炼**：支持玩偶专属高级音色（草莓熊、小新、小丸子、胡迪等）。
  - **Local Wav**：用于本地无网调试的正弦波音调合成器。

## 🚀 快速开始

### 依赖安装

```bash
pip install -e .
```

### 运行示例代码

```bash
python examples/generate_and_synthesize.py
```
