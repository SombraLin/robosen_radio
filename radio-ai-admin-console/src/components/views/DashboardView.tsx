import React from 'react';
import { Doll, NewsClip } from '../../types';

interface DashboardViewProps {
  newsClips?: NewsClip[];
  dolls?: Doll[];
  onNavigateToNews?: () => void;
  onNavigateToChannels?: () => void;
  onPlayClip?: (clip: NewsClip) => void;
  onToggleLive?: (dollId: string, channelId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  newsClips = [],
  dolls = [],
  onNavigateToNews,
  onNavigateToChannels,
  onPlayClip,
  onToggleLive,
}) => {
  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8 animate-fadeIn transition-colors duration-300">
      {/* Top Page Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <p className="font-data-mono text-[11px] text-[var(--accent)] uppercase tracking-[0.2em] mb-1">EDITORIAL OVERVIEW / 特刊导播</p>
          <h2 className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)] tracking-wide">系统运行状态概览</h2>
        </div>
        <button
          onClick={onNavigateToNews}
          className="flex items-center gap-2 py-2.5 px-5 bg-[var(--bg-subcard)] border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] font-serif-editorial font-bold text-xs uppercase tracking-wider rounded-sm transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          <span>创建新播报特刊</span>
        </button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Quick Stat 1 */}
        <div className="col-span-12 md:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-data-mono text-[var(--accent)] uppercase tracking-[0.15em]">今日编辑生成稿件</p>
            <span className="material-symbols-outlined text-[var(--accent)]">article</span>
          </div>
          <h3 className="text-3xl font-serif-editorial font-bold text-[var(--text-primary)]">1,432</h3>
          <div className="mt-4 flex items-center gap-2 text-[var(--accent)] font-data-mono text-xs">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>+12.5% 对比上刊</span>
          </div>
        </div>

        {/* Quick Stat 2 */}
        <div className="col-span-12 md:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-data-mono text-[var(--accent)] uppercase tracking-[0.15em]">待审阅点评稿</p>
            <span className="material-symbols-outlined text-[var(--accent)]">forum</span>
          </div>
          <h3 className="text-3xl font-serif-editorial font-bold text-[var(--text-primary)]">84</h3>
          <div className="mt-4 flex items-center gap-2 text-[var(--accent)] font-data-mono text-xs">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>已入队列等待撰写</span>
          </div>
        </div>

        {/* Quick Stat 3 */}
        <div className="col-span-12 md:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-data-mono text-[var(--accent)] uppercase tracking-[0.15em]">音频母带存储容量</p>
            <span className="material-symbols-outlined text-[var(--accent)]">cloud_done</span>
          </div>
          <h3 className="text-3xl font-serif-editorial font-bold text-[var(--text-primary)] mb-4">64%</h3>
          <div className="w-full h-1 bg-[var(--bg-subcard)] rounded-none overflow-hidden">
            <div className="h-full bg-[var(--accent)] w-[64%]"></div>
          </div>
        </div>

        {/* Live Channel Status Panel */}
        <div className="col-span-12 lg:col-span-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)] live-dot"></div>
              <span>频道直播在线状态</span>
              <span className="text-xs font-data-mono text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-2 py-0.5 rounded-sm">
                已同步 {dolls.reduce((acc, d) => acc + (d.channels || []).filter(channel => channel.isLive).length, 0)} 个开播频道
              </span>
            </h3>
            <button
              onClick={onNavigateToChannels}
              className="text-[var(--accent)] hover:underline font-data-mono text-xs cursor-pointer tracking-wider flex items-center gap-1"
            >
              <span>管理玩偶与频道</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="space-y-4">
            {dolls && dolls.length > 0 ? (
              dolls.map((doll) => {
                const liveChannels = (doll.channels || []).filter((channel) => channel.isLive);
                const isOnline = liveChannels.length > 0 || doll.status === 'online';

                return (
                  <div
                    key={doll.id}
                    className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm hover:border-[var(--accent)]/50 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Doll Header Info */}
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={doll.avatarUrl}
                            alt={doll.name}
                            className="w-11 h-11 rounded-sm object-cover border border-[var(--accent)]/40"
                          />
                          <div
                            className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-[var(--bg-primary)] ${
                              liveChannels.length > 0
                                ? 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse'
                                : 'bg-gray-500'
                            }`}
                          ></div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-serif-editorial font-bold text-[var(--text-primary)]">
                              {doll.name}
                            </h4>
                            <span className="font-data-mono text-[10px] text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded-sm border border-[var(--accent)]/20">
                              {doll.stationCode}
                            </span>
                            <span
                              className={`text-[10px] font-data-mono px-2 py-0.5 rounded-sm border ${
                                isOnline
                                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30'
                                  : 'bg-white/5 text-[var(--text-muted)] border-[var(--border-color)]'
                              }`}
                            >
                              {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                          </div>
                          <p className="font-data-mono text-[11px] text-[var(--text-muted)] mt-0.5">
                            {doll.streamInfo || 'Stream: 1080p | Latency: 12ms'}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar & Waveform */}
                      <div className="flex items-center gap-4 flex-1 max-w-xs justify-end">
                        <div className="flex flex-col items-end gap-1 w-full">
                          <div className="flex justify-between w-full font-data-mono text-[11px] text-[var(--text-muted)]">
                            <span>特刊播报进度</span>
                            <span className="text-[var(--accent)] font-bold">
                              {liveChannels.length > 0 ? `${doll.currentBroadcastProgress || 75}%` : '未开播'}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-[var(--bg-subcard)] rounded-none overflow-hidden">
                            <div
                              className={`h-full ${liveChannels.length > 0 ? 'bg-[var(--accent)]' : 'bg-gray-600'}`}
                              style={{ width: `${liveChannels.length > 0 ? (doll.currentBroadcastProgress || 75) : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        {liveChannels.length > 0 ? (
                          <div className="hidden sm:flex items-end h-6 gap-0.5 shrink-0">
                            <div className="w-0.5 bg-[var(--accent)] bar-1 h-full"></div>
                            <div className="w-0.5 bg-[var(--accent)] bar-2 h-3/4"></div>
                            <div className="w-0.5 bg-[var(--accent)] bar-3 h-full"></div>
                            <div className="w-0.5 bg-[var(--accent)] bar-4 h-1/2"></div>
                            <div className="w-0.5 bg-[var(--accent)] bar-5 h-5/6"></div>
                          </div>
                        ) : (
                          <span className="hidden sm:inline-block px-2 py-0.5 bg-white/5 border border-[var(--border-color)] text-[var(--text-muted)] rounded-sm font-data-mono text-[10px] shrink-0">
                            离线
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sub-Channels Badges List */}
                    {doll.channels && doll.channels.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border-color)]/60 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-data-mono text-[var(--text-muted)]">所属频道:</span>
                        {doll.channels.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => onToggleLive && onToggleLive(doll.id, v.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm font-data-mono text-[10px] border transition-all cursor-pointer ${
                              v.isLive
                                ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40 font-bold shadow-xs'
                                : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--accent)]/50'
                            }`}
                            title={v.isLive ? '点击关闭频道直播' : '点击开启频道直播'}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                v.isLive ? 'bg-[var(--accent)] animate-pulse' : 'bg-gray-500'
                              }`}
                            ></span>
                            <span>{v.channel_name || v.name}</span>
                            {v.category && (
                              <span className="text-[9px] px-1 bg-[var(--accent)]/10 rounded text-[var(--accent)] border border-[var(--accent)]/20 font-serif-editorial">
                                {v.category}
                              </span>
                            )}
                            <span className="opacity-70">[{v.doll_id}]</span>
                            <span className={`ml-1 text-[9px] font-sans ${v.isLive ? 'text-[var(--accent)] font-bold' : 'text-gray-400'}`}>
                              {v.isLive ? '● 直播中' : '○ 离线'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-[var(--text-muted)] font-data-mono text-xs">
                暂无玩偶数据，请前往“频道管理”创建玩偶角色。
              </div>
            )}
          </div>
        </div>

        {/* Categorized Topic Volume */}
        <div className="col-span-12 lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 flex flex-col justify-between">
          <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] mb-6">专栏话题热度</h3>
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div>
              <div className="flex justify-between text-xs font-data-mono mb-2">
                <span className="text-[var(--text-primary)] font-serif-editorial font-semibold">前沿科技（热门）</span>
                <span className="text-[var(--accent)]">4,120</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--bg-primary)]">
                <div className="h-full bg-[var(--accent)] w-[85%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-data-mono mb-2">
                <span className="text-[var(--text-primary)] font-serif-editorial font-semibold">金融市场</span>
                <span className="text-[var(--accent)]">2,840</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--bg-primary)]">
                <div className="h-full bg-[var(--accent)] opacity-80 w-[60%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-data-mono mb-2">
                <span className="text-[var(--text-primary)] font-serif-editorial font-semibold">国际时政</span>
                <span className="text-[var(--text-muted)]">1,530</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--bg-primary)]">
                <div className="h-full bg-[var(--text-muted)] w-[35%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="col-span-12 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)]">最近文案生成记录</h3>
            <button
              onClick={onNavigateToNews}
              className="text-[var(--accent)] hover:underline font-data-mono text-xs cursor-pointer tracking-wider"
            >
              进入新闻编辑室 →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] font-data-mono text-[11px] text-[var(--accent)] uppercase tracking-wider">
                  <th className="pb-3 pl-2 font-medium">时间戳</th>
                  <th className="pb-3 font-medium">关联播报角色</th>
                  <th className="pb-3 font-medium">稿件标题</th>
                  <th className="pb-3 font-medium">状态</th>
                  <th className="pb-3 text-right pr-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="text-xs font-data-mono divide-y divide-[var(--border-color)]">
                {(newsClips || []).slice(0, 5).map((clip) => (
                  <tr key={clip.id} className="hover:bg-[var(--bg-subcard)] transition-colors group">
                    <td className="py-3.5 pl-2 text-[var(--text-muted)]">{clip.createdAt} UTC</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]"></div>
                        <span className="font-serif-editorial">{clip.role}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-[var(--text-primary)] max-w-md truncate pr-4 font-serif-editorial font-medium">
                      {clip.title}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-data-mono border ${
                          clip.status === '已就绪'
                            ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30'
                            : clip.status === '生成中'
                            ? 'bg-[#B85243]/15 text-[#B85243] border-[#B85243]/30 animate-pulse'
                            : 'bg-white/5 text-[var(--text-muted)] border-[var(--border-color)]'
                        }`}
                      >
                        {clip.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <button
                        onClick={() => onPlayClip?.(clip)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-subcard)] rounded-sm transition-all cursor-pointer"
                        title="试听/试读"
                      >
                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
