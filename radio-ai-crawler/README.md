# RADIO AI Crawler (新闻抓取与清洗 SDK)

本工程是 RADIO AI 玩偶互动频道平台的**新闻抓取、标签归一化与数据校验清洗独立 SDK**。

## 📦 核心功能

- **ZAKER API / RSS 异步抓取**：基于 `httpx` 异步请求与指数退避重试机制。
- **智能数据清洗**：支持 HTML 标签剥离、NFKC 字符规范化、发布时间多格式解析。
- **多重校验过滤**：标题长度校验、URL 规范校验、近 24 小时时间约束、文本有效字符密度校验。

## 🚀 快速开始

### 依赖安装

```bash
pip install -e .
```

### 运行示例代码

```bash
python examples/fetch_hot_news.py
```
