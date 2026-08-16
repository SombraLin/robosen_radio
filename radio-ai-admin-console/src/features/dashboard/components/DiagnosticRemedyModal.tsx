import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ModuleDiagnosticResult } from '../types';
import { useApiKeyStore } from '../../../shared/store/useApiKeyStore';

interface DiagnosticRemedyModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ModuleDiagnosticResult | null;
  onRetest?: (moduleId: string) => void;
}

export const DiagnosticRemedyModal: React.FC<DiagnosticRemedyModalProps> = ({
  isOpen,
  onClose,
  result,
  onRetest,
}) => {
  const navigate = useNavigate();
  const setApiKeyModalOpen = useApiKeyStore((s) => s.setSettingsModalOpen);

  if (!isOpen || !result) return null;

  const isHealthy = result.status === 'healthy';
  const isWarning = result.status === 'warning';
  const isError = result.status === 'error';

  const handleQuickAction = () => {
    onClose();
    if (result.quick_action === 'open_api_key_modal') {
      setApiKeyModalOpen(true);
    } else if (result.quick_action === 'view_automation') {
      navigate('/automation');
    } else if (result.quick_action === 'view_logs') {
      navigate('/logs');
    } else if (result.quick_action === 'view_trash') {
      navigate('/trash');
    } else if (result.quick_action === 'retry_crawler') {
      navigate('/news');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-2xl rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between ${
            isError
              ? 'bg-rose-500/10'
              : isWarning
              ? 'bg-amber-500/10'
              : 'bg-emerald-500/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`material-symbols-outlined text-2xl ${
                isError ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'
              }`}
            >
              {isError ? 'cancel' : isWarning ? 'warning' : 'check_circle'}
            </span>
            <div>
              <h3 className="font-serif-editorial font-bold text-base text-[var(--text-primary)]">
                {result.module_name} · 诊断排障报告
              </h3>
              <p className="text-[11px] font-data-mono text-[var(--text-muted)]">
                测试时间: {result.tested_at} · 探针耗时: {result.latency_ms}ms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subcard)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar text-xs">
          {/* Status Capsule */}
          <div className="flex items-center justify-between p-3.5 rounded-sm bg-[var(--bg-subcard)] border border-[var(--border-color)]">
            <span className="font-serif-editorial text-[var(--text-muted)] font-bold">当前诊断状态</span>
            <span
              className={`px-2.5 py-1 rounded text-xs font-data-mono font-bold flex items-center gap-1.5 ${
                isError
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : isWarning
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>{isError ? '异常故障 (ERROR)' : isWarning ? '次级告警 (WARNING)' : '运行健康 (HEALTHY)'}</span>
            </span>
          </div>

          {/* Test Summary */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[var(--accent)]">analytics</span>
              <span>探针测试结论</span>
            </h4>
            <div className="p-3 rounded-sm bg-[var(--bg-primary)] border border-[var(--border-color)] font-serif-editorial text-sm leading-relaxed text-[var(--text-primary)]">
              {result.summary}
            </div>
          </div>

          {/* Root Cause & Remediation (If not fully healthy) */}
          {(result.root_cause || result.actionable_remedy) && (
            <div className="space-y-3 p-4 rounded-sm bg-rose-500/5 border border-rose-500/20">
              {result.root_cause && (
                <div>
                  <h4 className="text-xs font-serif-editorial font-bold text-rose-400 flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-sm">troubleshoot</span>
                    <span>故障根因分析 (Root Cause)</span>
                  </h4>
                  <p className="font-data-mono text-[11px] text-rose-300/90 leading-relaxed bg-black/20 p-2.5 rounded border border-rose-500/20 break-all">
                    {result.root_cause}
                  </p>
                </div>
              )}

              {result.actionable_remedy && (
                <div>
                  <h4 className="text-xs font-serif-editorial font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-sm">build_circle</span>
                    <span>智能排查修复指引 (Actionable Remedy)</span>
                  </h4>
                  <p className="font-serif-editorial text-xs text-[var(--text-primary)] leading-relaxed bg-black/20 p-2.5 rounded border border-amber-500/20">
                    {result.actionable_remedy}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Raw Metrics & Probe Details */}
          {result.details && Object.keys(result.details).length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-data-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">code</span>
                <span>底层探测参数 (Probe Trace Info)</span>
              </h4>
              <pre className="p-3 bg-black/40 rounded border border-white/10 font-data-mono text-[11px] text-emerald-400/90 overflow-x-auto">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[var(--bg-subcard)] border-t border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {result.quick_action && (
              <button
                onClick={handleQuickAction}
                className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial font-bold text-xs rounded-sm hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-base">forward</span>
                <span>
                  {result.quick_action === 'open_api_key_modal'
                    ? '前往配置 API Key'
                    : result.quick_action === 'view_automation'
                    ? '前往自动化配置'
                    : result.quick_action === 'view_logs'
                    ? '查看详细运行日志'
                    : '前往处理'}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {onRetest && (
              <button
                onClick={() => onRetest(result.module_id)}
                className="px-3.5 py-2 border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] rounded-sm text-xs font-serif-editorial transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>重新测试本项</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-subcard)] text-[var(--text-primary)] rounded-sm text-xs font-serif-editorial transition-colors cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
