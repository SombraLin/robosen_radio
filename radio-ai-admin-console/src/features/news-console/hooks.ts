import { useCallback } from 'react';
import { useNewsStore } from './store';
import { NewsClip } from './types';
import { isRadioAiApiEnabled } from '../../shared/api/client';
import { getAdminNews, updateNewsScript, trashNews, restoreNews, getNewsDetail } from './api';

export function useNewsActions() {
  const {
    newsClips,
    setNewsClips,
    setSelectedNewsDetail,
    setIsNewsDetailOpen,
    setLoading,
    setError,
  } = useNewsStore();

  const loadNews = useCallback(async () => {
    if (!isRadioAiApiEnabled()) return;
    setLoading(true);
    try {
      const page = await getAdminNews({ pageSize: 100 });
      if (page.items && page.items.length > 0) {
        const categoryMap: Record<string, NewsClip['category']> = {
          tech: '科技',
          internet: '科技',
          finance: '市场',
          entertainment: '娱乐',
          hot: '文化',
          china: '政治',
          world: '政治',
          military: '政治',
          sports: '文化',
          auto: '科技',
        };
        const statusMap: Record<string, NewsClip['status']> = {
          ready: '已就绪',
          draft: '草稿',
          generating: '生成中',
          stale: '处理中',
          failed: '生成失败',
          interrupted: '生成失败',
        };
        setNewsClips(
          page.items.map((item) => ({
            id: item.id,
            category: categoryMap[item.tag] || '文化',
            title: item.title,
            content: `${item.source} · ${item.tag} · 点评 ${item.commentary_ready_count}/${item.commentary_count}`,
            durationSeconds: 45,
            durationFormatted: '0:45',
            role: item.source,
            status: statusMap[item.script_status] || '草稿',
            createdAt: new Date(item.updated_at).toLocaleString('zh-CN', { hour12: false }),
          }))
        );
      }
    } catch (e: any) {
      console.error('加载新闻失败:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [setNewsClips, setLoading, setError]);

  const addNewsClip = useCallback(
    (clip: NewsClip) => {
      setNewsClips((prev) => [clip, ...prev]);
    },
    [setNewsClips]
  );

  const updateNewsClip = useCallback(
    (clipId: string, updates: Partial<NewsClip>) => {
      setNewsClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
      );
    },
    [setNewsClips]
  );

  const deleteNewsClip = useCallback(
    async (clipId: string) => {
      setNewsClips((prev) => prev.filter((c) => c.id !== clipId));
      if (isRadioAiApiEnabled()) {
        try {
          await trashNews(clipId);
        } catch (e) {
          console.warn('移入回收站失败:', e);
        }
      }
    },
    [setNewsClips]
  );

  const openNewsDetailById = useCallback(
    async (newsId: string) => {
      if (isRadioAiApiEnabled()) {
        try {
          const detail = await getNewsDetail(newsId);
          setSelectedNewsDetail(detail);
          setIsNewsDetailOpen(true);
          return;
        } catch (e) {
          console.warn('获取新闻详情失败:', e);
        }
      }
      setIsNewsDetailOpen(true);
    },
    [setSelectedNewsDetail, setIsNewsDetailOpen]
  );

  const saveScriptText = useCallback(
    async (newsId: string, text: string) => {
      if (isRadioAiApiEnabled()) {
        const updated = await updateNewsScript(newsId, text);
        setSelectedNewsDetail(updated);
      }
    },
    [setSelectedNewsDetail]
  );

  return {
    newsClips,
    loadNews,
    addNewsClip,
    updateNewsClip,
    deleteNewsClip,
    openNewsDetailById,
    saveScriptText,
  };
}
