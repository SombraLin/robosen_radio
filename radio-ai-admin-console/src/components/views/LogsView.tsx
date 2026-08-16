import React, { useState, useEffect, useRef } from 'react';
import { ExecutionLog } from '../../types';
import { requestJson } from '../../shared/api/client';

interface LogsViewProps {
  initialLogs?: ExecutionLog[];
}

export const LogsView: React.FC<LogsViewProps> = ({ initialLogs = [] }) => {
  const [logs, setLogs] = useState<ExecutionLog[]>(initialLogs);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lineLimit, setLineLimit] = useState<number>(200);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(2000); // 2s
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('source', selectedSource);
      params.append('level', selectedLevel);
      params.append('limit', lineLimit.toString());
      if (searchQuery.trim()) {
        params.append('keyword', searchQuery.trim());
      }

      const data = await requestJson<{ items?: any[]; total?: number }>(`/api/v1/admin/logs?${params.toString()}`);
      if (data && Array.isArray(data.items)) {
        const fetchedLogs: ExecutionLog[] = data.items.map((item: any) => ({
          id: item.id || `log-${Math.random()}`,
          timestamp: item.timestamp || new Date().toLocaleTimeString(),
          category: item.source === 'backend' ? '后端API' : item.source === 'tts' ? 'TTS引擎' : item.source === 'crawler' ? '爬虫服务' : '前端UI',
          level: item.level || 'info',
          source: item.source || 'backend',
          text: item.text || '',
          details: item.text || '',
          status: item.level === 'error' ? '失败' : item.level === 'success' ? '成功' : '处理中',
        }));
        setLogs(fetchedLogs);
      }
    } catch (e) {
      console.error('拉取实时日志异常:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedSource, selectedLevel, lineLimit]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, selectedSource, selectedLevel, lineLimit, searchQuery]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const [isCopiedAll, setIsCopiedAll] = useState<boolean>(false);
  const [copiedLineId, setCopiedLineId] = useState<string | null>(null);

  const handleCopyAllLogs = () => {
    const textContent = logs
      .map((l) => `[${l.timestamp}] [${(l.source || 'sys').toUpperCase()}] [${(l.level || 'info').toUpperCase()}] ${l.text || l.details || ''}`)
      .join('\n');
    navigator.clipboard.writeText(textContent).then(() => {
      setIsCopiedAll(true);
      setTimeout(() => setIsCopiedAll(false), 2000);
    });
  };

  const handleCopySingleLog = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLineId(id);
      setTimeout(() => setCopiedLineId(null), 2000);
    });
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleExportLogs = () => {
    const textContent = logs
      .map((l) => `[${l.timestamp}] [${(l.source || 'sys').toUpperCase()}] [${(l.level || 'info').toUpperCase()}] ${l.text || l.details || ''}`)
      .join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `radio_ai_logs_${Date.now()}.log`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (log.text || log.details || '').toLowerCase().includes(q);
      const matchCat = (log.category || '').toLowerCase().includes(q);
      return matchText || matchCat;
    }
    return true;
  });

  const getLevelBadgeClass = (level?: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-950/80 text-red-400 border-red-800/60 font-bold';
      case 'warn':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/60 font-bold';
      case 'success':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60 font-bold';
      default:
        return 'bg-sky-950/80 text-sky-400 border-sky-800/60 font-medium';
    }
  };

  const getSourceBadgeClass = (source?: string) => {
    switch (source) {
      case 'tts':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/40';
      case 'crawler':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-800/40';
      case 'ui':
        return 'bg-teal-950/70 text-teal-300 border-teal-800/40';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700/60';
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-md">
              <span className="material-symbols-outlined text-2xl">terminal</span>
            </div>
            <div>
              <h2 className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)] tracking-wide">
                实时日志与系统故障排查终端
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-data-mono mt-0.5">
                REAL-TIME SYSTEM OPERATION LOG MONITORING & TELEMETRY
              </p>
            </div>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[var(--bg-subcard)] hover:bg-[var(--border-color)] text-[var(--text-primary)] rounded border border-[var(--border-color)] text-xs font-serif-editorial flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className={`material-symbols-outlined text-sm ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>刷新日志</span>
          </button>

          <button
            onClick={handleCopyAllLogs}
            className="px-3 py-1.5 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/50 rounded text-xs font-serif-editorial flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">
              {isCopiedAll ? 'check' : 'content_copy'}
            </span>
            <span>{isCopiedAll ? '已复制全部' : '复制全部'}</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded text-xs font-serif-editorial flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">cleaning_services</span>
            <span>清屏</span>
          </button>

          <button
            onClick={handleExportLogs}
            className="px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 rounded text-xs font-serif-editorial flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>导出日志</span>
          </button>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Source Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              日志来源 (Source)
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded p-2 focus:border-[var(--accent)] outline-none font-serif-editorial"
            >
              <option value="all">全量日志 (All Sources)</option>
              <option value="backend">后端 API 服务 (backend.log)</option>
              <option value="tts">TTS 语音引擎 (tts_api.log)</option>
              <option value="crawler">新闻抓取服务 (crawler.log)</option>
            </select>
          </div>

          {/* Level Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              日志级别 (Level)
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded p-2 focus:border-[var(--accent)] outline-none font-serif-editorial"
            >
              <option value="all">所有级别 (All Levels)</option>
              <option value="error">ERROR / 404 / 异常报错</option>
              <option value="warn">WARN / 警告消息</option>
              <option value="info">INFO / 正常流程</option>
              <option value="success">SUCCESS / 成功响应</option>
            </select>
          </div>

          {/* Line Limit Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              读取行数 (Line Limit)
            </label>
            <select
              value={lineLimit}
              onChange={(e) => setLineLimit(Number(e.target.value))}
              className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded p-2 focus:border-[var(--accent)] outline-none font-data-mono"
            >
              <option value={50}>最新 50 行</option>
              <option value={100}>最新 100 行</option>
              <option value={200}>最新 200 行</option>
              <option value={500}>最新 500 行</option>
            </select>
          </div>

          {/* Auto Refresh & Speed */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              实时轮询推流
            </label>
            <div className="flex items-center gap-2 pt-1">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--bg-subcard)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2 text-xs text-[var(--text-primary)] font-serif-editorial">
                  {autoRefresh ? '已开启' : '已暂停'}
                </span>
              </label>
              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] text-[11px] rounded px-1.5 py-0.5 outline-none font-data-mono ml-auto"
                >
                  <option value={1000}>1 秒</option>
                  <option value={2000}>2 秒</option>
                  <option value={5000}>5 秒</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[var(--text-muted)] text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索日志关键字 (如：404, error, preview, audio, tts)..."
            className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded pl-9 pr-4 py-2 focus:border-[var(--accent)] outline-none font-data-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Log Terminal Window */}
      <div className="bg-slate-950 rounded-lg border border-slate-800 shadow-2xl overflow-hidden font-data-mono text-xs flex flex-col h-[560px]">
        {/* Terminal Header */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            <span className="text-[11px] text-slate-400 font-bold ml-2 tracking-wide">
              RADIO-AI STACK LOG STREAM // DISPATCHER & ENGINE LOGS
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>总计: <strong className="text-slate-200">{filteredLogs.length}</strong> 条记录</span>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold cursor-pointer border ${
                autoScroll ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {autoScroll ? '自动置底 ON' : '自动置底 OFF'}
            </button>
          </div>
        </div>

        {/* Terminal Content Body */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 p-4 overflow-y-auto space-y-1.5 custom-scrollbar text-slate-300"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-16">
              <span className="material-symbols-outlined text-4xl">subject</span>
              <p>暂无符合筛选条件的系统日志</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const lineText = log.text || log.details || '';
              const isErrorLine = log.level === 'error' || lineText.includes('404') || lineText.includes('500') || lineText.includes('ERROR');
              const logId = log.id || String(index);

              return (
                <div
                  key={logId}
                  className={`flex items-start gap-2 py-1 px-2 rounded hover:bg-slate-900/80 transition-colors group ${
                    isErrorLine ? 'bg-red-950/20' : ''
                  }`}
                >
                  <span className="text-slate-600 select-none w-8 text-right shrink-0">
                    {index + 1}
                  </span>

                  {/* Level Badge */}
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase shrink-0 ${getLevelBadgeClass(log.level)}`}>
                    {log.level || 'INFO'}
                  </span>

                  {/* Source Badge */}
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] shrink-0 ${getSourceBadgeClass(log.source)}`}>
                    {log.source || 'sys'}
                  </span>

                  {/* Log Content Line */}
                  <span className={`break-all leading-relaxed flex-1 ${isErrorLine ? 'text-red-300 font-semibold' : 'text-slate-200'}`}>
                    {lineText}
                  </span>

                  {/* Single Line Copy Button */}
                  <button
                    onClick={() => handleCopySingleLog(logId, lineText)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 flex items-center gap-1 cursor-pointer shrink-0"
                    title="复制此条日志"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {copiedLineId === logId ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedLineId === logId ? '已复制' : '复制'}</span>
                  </button>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

