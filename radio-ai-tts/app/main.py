import os
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.synthesizer import synthesize

app = FastAPI(title="Radio AI TTS Service", version="1.0.0")

# 预设的常见音色列表
VOICES = [
    {"provider": "edge", "voice_id": "zh-CN-XiaoxiaoNeural", "name": "晓晓 (女声/温柔)"},
    {"provider": "edge", "voice_id": "zh-CN-YunxiNeural", "name": "云希 (男声/阳光)"},
    {"provider": "edge", "voice_id": "zh-CN-YunjianNeural", "name": "云健 (男声/成熟)"},
    {"provider": "bailian", "voice_id": "longanya_v3", "name": "龙安雅 (女声/CosyVoice3)"},
    {"provider": "bailian", "voice_id": "longxiaochun_v3", "name": "龙小淳 (女声/CosyVoice3)"},
    {"provider": "bailian", "voice_id": "cosyvoice-v1", "name": "默认 CosyVoice1 (百炼)"}
]

class GenerateRequest(BaseModel):
    text: str
    voice_id: str | None = None
    provider: str | None = None
    api_key: str | None = None

@app.get("/api/voices")
async def get_voices():
    """获取支持的常用音色列表"""
    return {"status": "success", "data": VOICES}

@app.post("/api/generate")
async def generate_tts(req: GenerateRequest):
    """生成 TTS 音频流"""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="播报稿不能为空")
        
    output_dir = Path("output_audio")
    output_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    unique_id = uuid.uuid4().hex[:8]
    output_stem = output_dir / f"tts_{unique_id}"
    
    try:
        path, duration, size = await synthesize(
            text=req.text,
            voice_id=req.voice_id or "",
            output_stem=output_stem,
            tts_provider=req.provider,
            api_key=req.api_key
        )
        return FileResponse(
            path, 
            media_type="audio/mpeg" if path.suffix == ".mp3" else "audio/wav",
            filename=path.name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
