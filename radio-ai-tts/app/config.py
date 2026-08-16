import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    tts_provider: str = Field(default="edge", validation_alias="RADIO_AI_TTS_PROVIDER")
    default_voice: str = Field(default="zh-CN-XiaoxiaoNeural", validation_alias="RADIO_AI_DEFAULT_VOICE")
    dashscope_api_key: str = Field(default="", validation_alias="DASHSCOPE_API_KEY")
    bailian_tts_model: str = Field(default="cosyvoice-v3-flash", validation_alias="BAILIAN_TTS_MODEL")
    bailian_default_voice: str = Field(default="longanya_v3", validation_alias="BAILIAN_DEFAULT_VOICE")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
