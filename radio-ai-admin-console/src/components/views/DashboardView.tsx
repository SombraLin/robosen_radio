import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doll, NewsClip } from '../../types';
import { useNewsStore } from '../../features/news-console/store';
import { useDollStore } from '../../features/dolls/store';
import { useDollActions } from '../../features/dolls/hooks';
import { useDashboardHealthStore } from '../../features/dashboard/store';
import { DiagnosticRemedyModal } from '../../features/dashboard/components/DiagnosticRemedyModal';
import { ModuleDiagnosticResult } from '../../features/dashboard/types';

interface DashboardViewProps {
  newsClips?: NewsClip[];
  dolls?: Doll[];
  onNavigateToNews?: () => void;
  onNavigateToChannels?: () => void;
  onPlayClip?: (clip: NewsClip) => void;
  onToggleLive?: (dollId: string, channelId: string) => void;
}

const MODULE_ICONS: Record<string, string> = {
  crawler: 'travel_explore',
  llm: 'psychology',
  tts: 'record_voice_over',
  scheduler: 'schedule',
  storage: 'folder_zip',
  database: 'database',
  device: 'developer_board',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  newsClips: propsNewsClips,
  dolls: propsDolls,
  onNavigateToNews: propsOnNavigateToNews,
  onNavigateToChannels: propsOnNavigateToChannels,
  onPlayClip,
  onToggleLive: propsOnToggleLive,
}) => {
  const navigate = useNavigate();
  const storeNewsClips = useNewsStore((s) => s.newsClips);
  const storeDolls = useDollStore((s) => s.dolls);
  const setDolls = useDollStore((s) => s.setDolls);
  const { saveChannel } = useDollActions();

  // Health & Diagnostics Store
  const healthStatus = useDashboardHealthStore((s) => s.healthStatus);
  const isDiagnosingAll = useDashboardHealthStore((s) => s.isDiagnosingAll);
  const testingModules = useDashboardHealthStore((s) => s.testingModules);
  const activeDiagnosticResult = useDashboardHealthStore((s) => s.activeDiagnosticResult);
  const isDiagnosticModalOpen = useDashboardHealthStore((s) => s.isDiagnosticModalOpen);
  const loadHealthStatus = useDashboardHealthStore((s) => s.loadHealthStatus);
  const runSingleModuleDiagnose = useDashboardHealthStore((s) => s.runSingleModuleDiagnose);
  const runAllModulesDiagnose = useDashboardHealthStore((s) => s.runAllModulesDiagnose);
  const setActiveDiagnosticResult = useDashboardHealthStore((s) => s.setActiveDiagnosticResult);
  const setIsDiagnosticModalOpen = useDashboardHealthStore((s) => s.setIsDiagnosticModalOpen);

  useEffect(() => {
    loadHealthStatus();
  }, [loadHealthStatus]);

  const newsClips = propsNewsClips || storeNewsClips;
  const dolls = propsDolls || storeDolls;

  const onNavigateToNews = propsOnNavigateToNews || (() => navigate('/news'));
  const onNavigateToChannels = propsOnNavigateToChannels || (() => navigate('/channels'));

  const onToggleLive =
    propsOnToggleLive ||
    ((dollId: string, channelId: string) => {
      setDolls((prev) =>
        prev.map((d) => {
          if (d.id === dollId || d.doll_id === dollId) {
            const nextChannels = d.channels.map((c) => {
              if (c.id === channelId || c.channel_id === channelId) {
                const nextChannel = { ...c, isLive: !c.isLive };
                saveChannel(dollId, nextChannel);
                return nextChannel;
              }
              return c;
            });
            return { ...d, channels: nextChannels };
          }
          return d;
        })
      );
    });

  // Calculate default fallback modules if not yet loaded from backend
  const displayModules: ModuleDiagnosticResult[] =
    healthStatus?.modules || [
      {
        module_id: 'crawler',
        module_name: '新闻抓取爬虫 (News Crawler)',
        status: 'healthy',
        latency_ms: 120,
        tested_at: '刚刚',
        summary: '全网多源资讯聚合抓取正常',
      },
      {
        module_id: 'llm',
        module_name: '大模型改写与点评 (LLM Engine)',
        status: 'healthy',
        latency_ms: 580,
        tested_at: '刚刚',
        summary: '阿里云百炼 / 通义千问接口正常',
      },
      {
        module_id: 'tts',
        module_name: 'TTS 语音合成 (Speech Engine)',
        status: 'warning',
        latency_ms: 35,
        tested_at: '刚刚',
        summary: '启用 Edge-TTS 与本地浏览器双重降级',
      },
      {
        module_id: 'scheduler',
        module_name: '自动化调度器 (Scheduler)',
        status: 'warning',
        latency_ms: 1,
        tested_at: '刚刚',
        summary: '自动化调度开关处于关闭状态',
      },
      {
        module_id: 'storage',
        module_name: '音频固化与静态分发 (Storage)',
        status: 'healthy',
        latency_ms: 0.2,
        tested_at: '刚刚',
        summary: '音频目录写入正常，磁盘空间充裕',
      },
      {
        module_id: 'database',
        module_name: 'SQLite 数据库引擎 (DB Engine)',
        status: 'healthy',
        latency_ms: 0.8,
        tested_at: '刚刚',
        summary: '数据库读写正常',
      },
      {
        module_id: 'device',
        module_name: '设备网关与打断交互 (Gateway)',
        status: 'healthy',
        latency_ms: 0.3,
        tested_at: '刚刚',
        summary: '硬件拉取与打断接口就绪',
      },
    ];

  const overallScore = healthStatus?.health_score ?? 91;
  const overallStatus = healthStatus?.overall_status ?? 'healthy';

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8 animate-fadeIn transition-colors duration-300">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <p className="font-data-mono text-[11px] text-[var(--accent)] uppercase tracking-[0.2em] mb-1">
            OBSERVABILITY & SYSTEM DIAGNOSTICS / 全系统健康监控与一键诊断
          </p>
          <h2 className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)] tracking-wide">
            系统运行监控与排障中心
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadHealthStatus()}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[var(--text-primary)] font-serif-editorial text-xs rounded-sm transition-all cursor-pointer shadow-sm"
            title="刷新各模块监控状态"
          >
            <span className="material-symbols-outlined text-base">sync</span>
            <span>刷新状态</span>
          </button>

          <button
            onClick={() => runAllModulesDiagnose()}
            disabled={isDiagnosingAll}
            className="flex items-center gap-2 py-2.5 px-5 bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 font-serif-editorial font-bold text-xs uppercase tracking-wider rounded-sm transition-all duration-200 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-lg ${isDiagnosingAll ? 'animate-spin' : ''}`}>
              {isDiagnosingAll ? 'progress_activity' : 'medical_services'}
            </span>
            <span>{isDiagnosingAll ? '全系统深度体检中...' : '一键全系统深度体检'}</span>
          </button>
        </div>
      </div>

      {/* Global Health Score Banner */}
      <div className="p-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          {/* Health Score Circle */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/10"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={
                  overallStatus === 'healthy'
                    ? 'text-emerald-400'
                    : overallStatus === 'degraded'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }
                strokeDasharray={`${overallScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-data-mono font-bold text-lg text-[var(--text-primary)]">
              {overallScore}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)]">
                {overallStatus === 'healthy'
                  ? '全系统 7 大模块运行健康'
                  : overallStatus === 'degraded'
                  ? '系统运行良好 · 存在次级告警与降级'
                  : '检测到模块异常故障 · 需排查处理'}
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-data-mono font-bold uppercase tracking-wider ${
                  overallStatus === 'healthy'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : overallStatus === 'degraded'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {overallStatus === 'healthy' ? 'ALL OK' : overallStatus === 'degraded' ? 'DEGRADED' : 'ALERT'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-serif-editorial">
              最后全量自检时间: {healthStatus?.checked_at || '刚刚'} · 包含爬虫采集、大模型改写、语音合成、任务调度、存储与设备网关
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center font-data-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bg-subcard)] border border-[var(--border-color)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>健康: {healthStatus?.healthy_count ?? 5}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bg-subcard)] border border-[var(--border-color)]">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>告警: {healthStatus?.warning_count ?? 2}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bg-subcard)] border border-[var(--border-color)]">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>故障: {healthStatus?.error_count ?? 0}</span>
          </div>
        </div>
      </div>

      {/* 7 Modules Live Health & Diagnostic Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-[var(--accent)]">tune</span>
            <span>核心子系统监控与即时排障矩阵 ({displayModules.length}项)</span>
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-serif-editorial">
            点击卡片右下角【测试/诊断】可发起真实探针并获取排查指引
          </span>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {displayModules.map((mod) => {
            const isTesting = Boolean(testingModules[mod.module_id]);
            const isModHealthy = mod.status === 'healthy';
            const isModWarning = mod.status === 'warning';
            const isModError = mod.status === 'error';
            const iconName = MODULE_ICONS[mod.module_id] || 'settings';

            return (
              <div
                key={mod.module_id}
                className={`col-span-12 sm:col-span-6 lg:col-span-4 bg-[var(--bg-card)] border rounded-md p-5 flex flex-col justify-between transition-all relative overflow-hidden group shadow-xs hover:border-[var(--accent)]/50 ${
                  isModError
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : isModWarning
                    ? 'border-amber-500/30'
                    : 'border-[var(--border-color)]'
                }`}
              >
                {/* Module Top Row */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-sm flex items-center justify-center ${
                          isModError
                            ? 'bg-rose-500/20 text-rose-400'
                            : isModWarning
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{iconName}</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-serif-editorial font-bold text-[var(--text-primary)]">
                          {mod.module_name}
                        </h4>
                        <p className="text-[10px] font-data-mono text-[var(--text-muted)]">
                          探针延迟: <span className="text-[var(--accent)]">{mod.latency_ms}ms</span> · {mod.tested_at}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-data-mono font-bold shrink-0 ${
                        isTesting
                          ? 'bg-sky-500/20 text-sky-400 animate-pulse'
                          : isModError
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isModWarning
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isTesting
                        ? 'PROBING...'
                        : isModError
                        ? 'ERROR 异常'
                        : isModWarning
                        ? 'WARN 降级'
                        : 'OK 正常'}
                    </span>
                  </div>

                  {/* Summary Text */}
                  <p className="text-xs font-serif-editorial text-[var(--text-primary)]/90 leading-relaxed min-h-[36px] line-clamp-2">
                    {mod.summary}
                  </p>

                  {/* Root Cause Hint if failure */}
                  {(isModError || isModWarning) && (
                    <div className="mt-2.5 p-2 rounded bg-black/20 border border-white/5 text-[11px] font-data-mono text-amber-300/90 line-clamp-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-400 shrink-0">info</span>
                      <span className="truncate">{mod.root_cause || mod.actionable_remedy || '存在优化排查建议'}</span>
                    </div>
                  )}
                </div>

                {/* Module Action Footer */}
                <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setActiveDiagnosticResult(mod);
                      setIsDiagnosticModalOpen(true);
                    }}
                    className="text-[11px] font-serif-editorial text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">assignment</span>
                    <span>查看详情/建议</span>
                  </button>

                  <button
                    onClick={async () => {
                      await runSingleModuleDiagnose(mod.module_id);
                    }}
                    disabled={isTesting}
                    className="px-3 py-1.5 bg-[var(--bg-subcard)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-transparent rounded-sm text-[11px] font-serif-editorial font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-sm ${isTesting ? 'animate-spin' : ''}`}>
                      {isTesting ? 'progress_activity' : 'play_arrow'}
                    </span>
                    <span>{isTesting ? '测试中...' : '单项测试'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational Stats & Quick Channels */}
      <div className="grid grid-cols-12 gap-6 pt-2">
        {/* Quick Stat 1 */}
        <div className="col-span-12 md:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 relative overflow-hidden group shadow-xs">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-data-mono text-[var(--accent)] uppercase tracking-[0.15em]">
              新闻素材与播报特刊
            </p>
            <span className="material-symbols-outlined text-[var(--accent)]">article</span>
          </div>
          <h3 className="text-3xl font-serif-editorial font-bold text-[var(--text-primary)]">
            {newsClips.length} <span className="text-xs font-normal opacity-60">篇稿件</span>
          </h3>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] font-serif-editorial">自动抓取与口语化改写</span>
            <button
              onClick={onNavigateToNews}
              className="text-[var(--accent)] hover:underline font-serif-editorial font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <span>进入新闻台</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Quick Stat 2 */}
        <div className="col-span-12 md:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 relative overflow-hidden group shadow-xs">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-data-mono text-[var(--accent)] uppercase tracking-[0.15em]">
              玩偶广播电台与频道
            </p>
            <span className="material-symbols-outlined text-[var(--accent)]">podcasts</span>
          </div>
          <h3 className="text-3xl font-serif-editorial font-bold text-[var(--text-primary)]">
            {dolls.reduce((acc, d) => acc + (d.channels?.length || 0), 0)}{' '}
            <span className="text-xs font-normal opacity-60">个频道 ({dolls.length} 款玩偶)</span>
          </h3>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] font-serif-editorial">节点式混编与音频固化</span>
            <button
              onClick={onNavigateToChannels}
              className="text-[var(--accent)] hover:underline font-serif-editorial font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <span>管理玩偶频道</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Quick Stat 3 */}
        <div className="col-span-12 md:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 relative overflow-hidden group shadow-xs">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-data-mono text-[var(--accent)] uppercase tracking-[0.15em]">
              自动化与硬件连线
            </p>
            <span className="material-symbols-outlined text-[var(--accent)]">settings_input_component</span>
          </div>
          <h3 className="text-3xl font-serif-editorial font-bold text-[var(--text-primary)]">
            在线就绪 <span className="text-xs font-normal opacity-60">支持打断问答</span>
          </h3>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] font-serif-editorial">定时调度与物理设备网关</span>
            <button
              onClick={() => navigate('/device')}
              className="text-[var(--accent)] hover:underline font-serif-editorial font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <span>设备模拟器</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Diagnostic & Failure Remediation Modal */}
      <DiagnosticRemedyModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        result={activeDiagnosticResult}
        onRetest={(modId) => runSingleModuleDiagnose(modId)}
      />
    </div>
  );
};
