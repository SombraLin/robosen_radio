import React, { useEffect, useState } from 'react';
import { AdminNewsSummaryDto, getAdminNews, isRadioAiApiEnabled, restoreNews } from '../../api/newsCenter';

export const TrashView: React.FC = () => {
  const [items, setItems] = useState<AdminNewsSummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState('');

  const load = async () => {
    if (!isRadioAiApiEnabled()) return;
    setLoading(true);
    setError('');
    try {
      const page = await getAdminNews({ trash: true, pageSize: 100 });
      setItems(page.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '加载回收站失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const restore = async (item: AdminNewsSummaryDto) => {
    setRestoringId(item.id);
    setError('');
    try {
      await restoreNews(item.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '恢复新闻失败');
    } finally {
      setRestoringId('');
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fadeIn">
      <div className="flex items-end justify-between border-b border-[var(--border-color)] pb-5 mb-6">
        <div>
          <h2 className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)] tracking-wide">回收站</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">新闻采用软删除，可恢复；这里不提供永久清空。</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="px-4 py-2 border border-[var(--border-color)] text-xs text-[var(--accent)] disabled:opacity-50 cursor-pointer">刷新</button>
      </div>

      {error && <div className="mb-4 p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-xs">{error}</div>}
      {loading && items.length === 0 && <div className="py-16 text-center text-[var(--text-muted)]">正在加载回收站…</div>}
      {!loading && items.length === 0 && <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-16 text-center">
        <span className="material-symbols-outlined text-4xl text-[var(--text-muted)]/40">delete_sweep</span>
        <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] mt-3">回收站为空</h3>
      </div>}

      <div className="space-y-3">
        {items.map((item) => <div key={item.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-serif-editorial font-bold text-[var(--text-primary)] truncate">{item.title}</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">{item.source} · {item.tag} · 回收时间 {item.deleted_at ? new Date(item.deleted_at).toLocaleString('zh-CN') : '-'}</p>
          </div>
          <button disabled={restoringId === item.id} onClick={() => void restore(item)} className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0">{restoringId === item.id ? '恢复中…' : '恢复新闻'}</button>
        </div>)}
      </div>
    </div>
  );
};
