"""
radio-ai-crawler 使用示例
演示如何独立调用 ZAKER 新闻抓取接口获取热门/科技分类的新闻数据。
"""

import asyncio
import sys
from pathlib import Path

# 将模块路径加入 sys.path 以保证免安装直接可运行
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from radio_ai_crawler import fetch_zaker, normalize_tag

async def main():
    print("📡 正在调用 ZAKER 新闻抓取 SDK...")
    
    # 1. 抓取热点新闻 (Hot)
    candidates, stats = await fetch_zaker("hot")
    print(f"✅ 抓取统计信息: {stats}")
    print(f"成功筛选出 {len(candidates)} 条有效近 24 小时热点新闻:")
    for idx, c in enumerate(candidates[:3], 1):
        print(f" [{idx}] {c.title}")
        print(f"     来源: {c.source} | 时间: {c.published_at}")
        print(f"     摘要: {c.clean_summary[:60]}...")
        print(f"     URL: {c.url}")
        print()

    # 2. 抓取科技分类新闻 (Tech)
    tech_candidates, tech_stats = await fetch_zaker(normalize_tag("technology"))
    print(f"✅ 科技频道抓取完成，共 {len(tech_candidates)} 条新闻。")

if __name__ == "__main__":
    asyncio.run(main())
