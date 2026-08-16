# API 接口文档

Radio AI TTS 模块提供以下 HTTP API：

## 1. 查询支持的音色列表

**接口路径**: `GET /api/voices`

**功能描述**: 获取系统内置及支持的音色列表。

**响应示例**:
```json
{
  "status": "success",
  "data": [
    {
      "provider": "edge",
      "voice_id": "zh-CN-XiaoxiaoNeural",
      "name": "晓晓 (女声/温柔)"
    },
    {
      "provider": "bailian",
      "voice_id": "longanya_v3",
      "name": "龙安雅 (女声/CosyVoice3)"
    }
  ]
}
```

---

## 2. 生成 TTS 音频

**接口路径**: `POST /api/generate`

**功能描述**: 接收待播报的文本，生成音频文件并以文件流返回。

**请求头 (Headers)**:
- `Content-Type: application/json`

**请求体 (Body)**:
```json
{
  "text": "你好，这是一段测试音频的内容。",
  "voice_id": "zh-CN-XiaoxiaoNeural",
  "provider": "edge"
}
```

**参数说明**:
| 参数名     | 类型   | 必填 | 描述                                       |
|------------|--------|------|--------------------------------------------|
| `text`     | string | 是   | 需要转语音的文本内容                       |
| `voice_id` | string | 否   | 发音人 ID，例如 `zh-CN-XiaoxiaoNeural`     |
| `provider` | string | 否   | TTS 供应商，`edge` 或 `bailian`，默认为空以自动推断或使用默认配置 |

**响应**:
- 成功: 返回二进制音频流 (`audio/mpeg` 或 `audio/wav`)，可直接播放或保存为文件。
- 失败: 返回包含错误信息的 JSON（HTTP 4xx 或 500）。
