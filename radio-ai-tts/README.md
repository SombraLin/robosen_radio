# Radio AI TTS 独立模块

这是一个独立的 TTS 服务模块，支持基于 Edge-TTS 和 阿里百炼（CosyVoice）生成文本转语音音频。

## 1. 安装与配置

```bash
# 1. 创建虚拟环境 (推荐)
python -m venv .venv
source .venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置文件
cp .env.example .env
# 编辑 .env 文件，配置必需的模型参数和 API Key（如百炼需要配置 DASHSCOPE_API_KEY）
```

> **注意**：环境配置中的 API-key 等敏感信息不要提交到代码库中。

## 2. 服务生命周期管理

本项目封装了快捷的启动和关闭脚本：

### 启动服务
```bash
./start.sh
```
执行后，服务将在后台默认运行在 `0.0.0.0:8018`，并将 PID 保存在 `tts_service.pid` 文件中。

### 停止服务
```bash
./stop.sh
```
执行后将根据 `tts_service.pid` 平滑停止后台服务。

## 3. 接口调用

服务启动后，可以通过以下文档了解接口详情：
- [API 文档](./docs/api.md)
- [Swagger UI](http://127.0.0.1:8018/docs) (启动后可访问)
