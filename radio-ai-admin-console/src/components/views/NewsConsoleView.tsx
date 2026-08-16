import React, { useState } from 'react';
import { NewsClip, BroadcastChainItem, NewsCategory, NewsStatus } from '../../types';

interface NewsConsoleViewProps {
  newsClips: NewsClip[];
  chainItems: BroadcastChainItem[];
  onAddToChain: (clip: NewsClip) => void;
  onRemoveFromChain: (id: string) => void;
  onReorderChain: (startIndex: number, endIndex: number) => void;
  onOpenPreviewModal: () => void;
  onOpenNewBroadcast: () => void;
  searchQuery: string;
  onOpenNews?: (newsId: string) => void;
}

export const NewsConsoleView: React.FC<NewsConsoleViewProps> = ({
  newsClips,
  chainItems,
  onAddToChain,
  onRemoveFromChain,
  onReorderChain,
  onOpenPreviewModal,
  onOpenNewBroadcast,
  searchQuery,
  onOpenNews,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedStatuses, setSelectedStatuses] = useState<NewsStatus[]>(['已就绪', '草稿', '处理中', '生成中']);

  // Calculate total seconds in chain
  const totalSeconds = chainItems.reduce((acc, curr) => acc + curr.durationSeconds, 0);
  const totalMins = Math.floor(totalSeconds / 60);
  const totalRemSec = totalSeconds % 60;
  const totalFormatted = `${totalMins}:${totalRemSec < 10 ? '0' : ''}${totalRemSec}`;

  const toggleStatus = (status: NewsStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const filteredClips = newsClips.filter((clip) => {
    const matchesCategory = selectedCategory === '全部' || clip.category === selectedCategory;
    const matchesStatus = selectedStatuses.includes(clip.status);
    const matchesSearch =
      !searchQuery ||
      clip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 h-[calc(100vh-80px)] overflow-hidden grid grid-cols-12 gap-6 animate-fadeIn transition-colors duration-300">
      {/* Left Panel: Filters */}
      <aside className="col-span-12 lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        <div>
          <h3 className="text-base font-serif-editorial font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            <span className="material-symbols-outlined text-lg text-[var(--accent)]">filter_list</span>
            <span>内容编辑筛选</span>
          </h3>

          <div className="space-y-6">
            {/* Category Filter */}
            <div>
              <label className="font-data-mono text-[11px] text-[var(--accent)] mb-2 block uppercase tracking-[0.15em]">
                新闻板块分类
              </label>
              <div className="flex flex-wrap gap-2">
                {['全部', '科技', '政治', '市场', '文化', '娱乐'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-serif-editorial transition-all cursor-pointer border ${
                      selectedCategory === cat
                        ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] font-bold shadow-sm'
                        : 'bg-[var(--bg-subcard)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="font-data-mono text-[11px] text-[var(--accent)] mb-2 block uppercase tracking-[0.15em]">
                文案生成状态
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2 rounded-sm hover:bg-[var(--bg-subcard)] transition-colors cursor-pointer select-none border border-transparent hover:border-[var(--border-color)]">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes('已就绪')}
                    onChange={() => toggleStatus('已就绪')}
                    className="rounded-sm border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]"></span>
                  <span className="font-data-mono text-xs text-[var(--text-primary)]">已就绪审阅</span>
                </label>

                <label className="flex items-center gap-3 p-2 rounded-sm hover:bg-[var(--bg-subcard)] transition-colors cursor-pointer select-none border border-transparent hover:border-[var(--border-color)]">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes('草稿') || selectedStatuses.includes('生成中')}
                    onChange={() => {
                      toggleStatus('草稿');
                      toggleStatus('生成中');
                    }}
                    className="rounded-sm border-[var(--border-color)] bg-[var(--bg-primary)] text-[#B85243] focus:ring-[#B85243]"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B85243]"></span>
                  <span className="font-data-mono text-xs text-[var(--text-primary)]">草稿 / 编译中</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-auto pt-4 border-t border-[var(--border-color)]">
          <button
            onClick={onOpenNewBroadcast}
            className="w-full py-2.5 bg-[var(--bg-subcard)] hover:opacity-90 border border-[var(--accent)]/40 text-[var(--accent)] rounded-sm text-xs font-serif-editorial font-bold transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            <span>抓取并生成新闻</span>
          </button>
        </div>
      </aside>

      {/* Center Panel: News List */}
      <section className="col-span-12 lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-subcard)] flex justify-between items-center">
          <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--accent)]">feed</span>
            <span>可用稿件片段</span>
          </h3>
          <span className="font-data-mono text-xs text-[var(--accent)]">{filteredClips.length} 篇稿件</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {filteredClips.map((clip) => {
            const inChain = chainItems.some((ci) => ci.clipId === clip.id);
            return (
              <div
                key={clip.id}
                className="p-4 rounded-sm bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent)]/60 transition-all group relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-data-mono text-[11px] font-bold text-[var(--accent)] uppercase tracking-[0.15em]">
                    {clip.category}专栏
                  </span>
                  <div className="flex items-center gap-2">
                    {clip.status === '已就绪' ? (
                      <span className="px-2 py-0.5 rounded-sm bg-[var(--accent)]/15 text-[var(--accent)] font-data-mono text-[10px] border border-[var(--accent)]/30 uppercase tracking-wider">
                        已审阅
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-sm bg-[#B85243]/15 text-[#B85243] font-data-mono text-[10px] border border-[#B85243]/30 flex items-center gap-1 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                        撰写中
                      </span>
                    )}

                    <button
                      onClick={() => onAddToChain(clip)}
                      disabled={inChain}
                      className={`px-2.5 py-1 rounded-sm text-xs font-serif-editorial font-bold transition-all flex items-center gap-1 cursor-pointer uppercase ${
                        inChain
                          ? 'bg-[var(--bg-subcard)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed'
                          : 'bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 active:scale-95'
                      }`}
                      title={inChain ? '已在播报链条中' : '加入播报链条'}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {inChain ? 'check' : 'add'}
                      </span>
                      <span>{inChain ? '已选' : '编入'}</span>
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-serif-editorial font-bold text-[var(--text-primary)] mb-2 tracking-wide leading-snug">{clip.title}</h4>
                <p className="font-sans text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">
                  {clip.content}
                </p>

                <div className="mt-3 flex items-center justify-between text-[var(--text-muted)] font-data-mono text-[11px] pt-2 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[var(--accent)]">schedule</span>
                      {clip.durationFormatted}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[var(--accent)]">record_voice_over</span>
                      角色: {clip.role}
                    </span>
                  </div>
                  {onOpenNews && (
                    <button onClick={() => onOpenNews(clip.id)} className="text-[var(--accent)] hover:underline cursor-pointer">
                      编辑详情
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredClips.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)] font-data-mono text-xs">
              暂无匹配的新闻稿件
            </div>
          )}
        </div>
      </section>

      {/* Right Panel: Broadcast Chain Builder */}
      <section className="col-span-12 lg:col-span-4 bg-[var(--bg-card)] border border-[var(--accent)]/30 rounded-md flex flex-col overflow-hidden neon-glow">
        <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-subcard)]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--accent)]">view_timeline</span>
              <span>播报特刊编排链</span>
            </h3>
            <span className="px-2.5 py-1 rounded-sm bg-[var(--bg-primary)] border border-[var(--border-color)] font-data-mono text-xs text-[var(--accent)]">
              时长: {totalFormatted}
            </span>
          </div>

          <button
            onClick={onOpenPreviewModal}
            className="w-full bg-[var(--accent)]/15 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all font-serif-editorial font-bold text-xs uppercase tracking-widest py-2.5 rounded-sm flex justify-center items-center gap-2 group cursor-pointer active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined group-hover:animate-pulse">play_circle</span>
            <span>试听编排全轨</span>
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar relative">
          {/* Timeline Vertical Line */}
          <div className="absolute left-9 top-6 bottom-6 w-0.5 bg-[var(--border-color)] z-0"></div>

          <div className="space-y-4 relative z-10">
            {chainItems.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 group">
                {/* Node Icon */}
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                    item.type === 'music'
                      ? 'bg-[var(--bg-subcard)] border-[var(--text-muted)] text-[var(--text-muted)]'
                      : item.type === 'voice'
                      ? 'bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--text-primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {item.type === 'music'
                      ? 'music_note'
                      : item.type === 'voice'
                      ? 'record_voice_over'
                      : 'newspaper'}
                  </span>
                </div>

                {/* Card */}
                <div className="flex-1 bg-[var(--bg-primary)] p-3 rounded-sm border border-[var(--border-color)] flex items-center justify-between hover:border-[var(--accent)]/40 transition-all shadow-sm">
                  <div className="overflow-hidden pr-2">
                    <span className="block font-data-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.15em]">
                      {item.type === 'music'
                        ? '系统乐曲配乐'
                        : item.type === 'voice'
                        ? '主播开场独白'
                        : '新闻专题片段'}
                    </span>
                    <span className="block font-serif-editorial text-xs font-bold text-[var(--text-primary)] truncate mt-0.5">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-data-mono text-xs text-[var(--text-muted)]">{item.durationFormatted}</span>

                    {/* Reorder/Delete Buttons */}
                    <div className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                      {index > 0 && (
                        <button
                          onClick={() => onReorderChain(index, index - 1)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
                          title="上移"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_upward</span>
                        </button>
                      )}
                      {index < chainItems.length - 1 && (
                        <button
                          onClick={() => onReorderChain(index, index + 1)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
                          title="下移"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_downward</span>
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveFromChain(item.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-[#B85243] cursor-pointer"
                        title="从播放链移除"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Drop Zone Placeholder */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 mt-1">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)]/40"></div>
              </div>
              <div className="flex-1 chain-drop-zone rounded-sm h-16 flex items-center justify-center bg-[var(--bg-card)]/50 border-dashed">
                <span className="font-data-mono text-xs text-[var(--text-muted)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[var(--accent)]">add</span>
                  <span>选择左侧稿件编入特刊</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
