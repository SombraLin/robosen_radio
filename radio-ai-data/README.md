# RADIO AI Data (数据基础设施 SDK)

本工程是 RADIO AI 玩偶互动频道平台的**数据持久化与 Repository 独立 Python 包**。

## 📦 核心功能

- **SQLite WAL 并发数据库管理**：原子事务连接池、版本迁移及默认种子数据。
- **Repositories**：
  - `DollRepository`: 玩偶主体与频道 (Channels) 的持久化、保存与检索。
  - `NewsRepository`: 新闻抓取稿件、播报稿及语音关联数据的领域模型。
- **Storage**: 音频资产记录与底层文件持久化盘点。

## 🚀 快速开始

### 依赖安装

```bash
pip install -e .
```

### 运行示例代码

```bash
python examples/quickstart_db.py
```
