# RADIO AI Backend Service (REST API & 设备网关)

本工程是 RADIO AI 玩偶互动频道平台的**Web API 服务与硬件设备网关后端**。

## 📦 核心功能

- **Admin RESTful Services**：提供玩偶管理、频道管理、音频资产管理、新闻稿生成与生成式配置接口。
- **Device Gateway**：
  - 设备端开机频道与播放列表拉取 (`GET /api/v1/device/dolls/{doll_id}/channels`)
  - 播放进度实时上报 (`POST /api/v1/device/playback/status`)
  - 播放中打断对话上下文处理 (`POST /api/v1/device/interruption/chat`)
- **Theater WebSocket Session**：双玩偶/多设备剧场连线对白同步 (`WS /ws/v1/device/theater/channel-session`)。
- **Automated Scheduler**：新闻自动拉取与口语化 Pipeline 调度引擎。

## 🚀 启动说明

### 安装依赖

```bash
pip install -r requirements.txt
```

### 启动 Web 服务 (端口 8000)

```bash
python app/main.py
```

### 运行客户端测试示例

```bash
python examples/client_quickstart.py
```
