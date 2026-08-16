import React, { useEffect, useState } from 'react';
import {
  AutomationConfigDto,
  AutomationRunDto,
  AutomationStatusDto,
  getAutomationRuns,
  getAutomationStatus,
  runAutomationNow,
  setAutomationEnabled,
  updateAutomationConfig,
} from '../../api/newsCenter';

const TAG_LABELS: Record<string, string> = {
  hot: '热点', entertainment: '娱乐', auto: '汽车', sports: '体育', tech: '科技',
  china: '国内', world: '国际', military: '军事', finance: '财经', internet: '互联网',
};

export const AutomationView: React.FC = () => {
  const [status, setStatus] = useState<AutomationStatusDto | null>(null);
  const [draft, setDraft] = useState<AutomationConfigDto | null>(null);
  const [runs, setRuns] = useState<AutomationRunDto[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [nextStatus, runPage] = await Promise.all([getAutomationStatus(), getAutomationRuns()]);
      setStatus(nextStatus);
      setDraft(nextStatus.config);
      setRuns(runPage.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '加载自动任务失败');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const act = async (label: string, task: () => Promise<unknown>) => {
    setBusy(label);
    setError('');
    try {
      await task();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `${label}失败`);
    } finally {
      setBusy('');
    }
  };

  const totalTarget = Object.values(draft?.tags ?? {}).reduce<number>((sum, value) => sum + Number(value), 0);

  return <div className="p-8 max-w-[1440px] mx-auto space-y-6 animate-fadeIn">
    <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-[var(--border-color)] pb-6">
      <div><h2 className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)]">自动化与调度</h2><p className="text-xs text-[var(--text-muted)] mt-1">直接控制 RADIO AI 内置的新闻抓取与生成任务。</p></div>
      <div className="flex gap-2">
        <button onClick={() => void load()} disabled={Boolean(busy)} className="px-4 py-2 border border-[var(--border-color)] text-xs text-[var(--accent)] disabled:opacity-50 cursor-pointer">刷新</button>
        <button onClick={() => draft && void act('立即执行', () => runAutomationNow(draft.tags))} disabled={!draft || Boolean(busy) || totalTarget < 1} className="px-5 py-2 bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold disabled:opacity-50 cursor-pointer">{busy === '立即执行' ? '执行中…' : '立即执行一次'}</button>
      </div>
    </div>
    {error && <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-xs">{error}</div>}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-4">
        <div className="flex justify-between"><h3 className="font-serif-editorial font-bold">调度器状态</h3><span className="text-xs text-[var(--accent)]">{status?.scheduler_state || '加载中'}</span></div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[var(--bg-primary)] p-3"><span className="text-[var(--text-muted)] block">健康状态</span><strong>{status?.health_state || '-'}</strong></div>
          <div className="bg-[var(--bg-primary)] p-3"><span className="text-[var(--text-muted)] block">上次结果</span><strong>{status?.last_run_status || '-'}</strong></div>
          <div className="bg-[var(--bg-primary)] p-3 col-span-2"><span className="text-[var(--text-muted)] block">下次执行</span><strong>{status?.next_run_at ? new Date(status.next_run_at).toLocaleString('zh-CN') : '未计划'}</strong></div>
        </div>
        {draft && <button disabled={Boolean(busy)} onClick={() => void act(draft.enabled ? '暂停任务' : '启用任务', () => setAutomationEnabled(!draft.enabled, draft.version))} className="w-full py-2 border border-[var(--accent)] text-[var(--accent)] text-xs font-bold disabled:opacity-50 cursor-pointer">{draft.enabled ? '暂停自动任务' : '启用自动任务'}</button>}
      </div>

      <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-5">
        <div className="flex justify-between items-center"><h3 className="font-serif-editorial font-bold">抓取与生成配置</h3><span className="text-xs text-[var(--text-muted)]">单轮共 {totalTarget} 条 / 允许 1–27</span></div>
        {draft && <>
          <label className="text-xs text-[var(--text-muted)] flex items-center gap-3">执行间隔（分钟）<input type="number" min={30} max={1440} value={draft.interval_minutes} onChange={(event) => setDraft({ ...draft, interval_minutes: Number(event.target.value) })} className="w-28 bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)]" /></label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{Object.entries(draft.tags).map(([tag, count]) => <label key={tag} className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-3 text-xs"><span className="block text-[var(--text-muted)] mb-2">{TAG_LABELS[tag] || tag}</span><input type="number" min={0} max={20} value={count} onChange={(event) => setDraft({ ...draft, tags: { ...draft.tags, [tag]: Number(event.target.value) } })} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] p-2 text-[var(--text-primary)]" /></label>)}</div>
          <button disabled={Boolean(busy) || totalTarget < 1 || totalTarget > 27} onClick={() => void act('保存配置', () => updateAutomationConfig(draft))} className="px-5 py-2 bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold disabled:opacity-50 cursor-pointer">保存执行配置</button>
        </>}
      </div>
    </div>

    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden">
      <div className="p-5 border-b border-[var(--border-color)] flex justify-between"><h3 className="font-serif-editorial font-bold">真实运行记录</h3><span className="text-xs text-[var(--text-muted)]">最近 {runs.length} 条</span></div>
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-[var(--bg-primary)] text-[var(--text-muted)]"><tr><th className="p-3 text-left">开始时间</th><th className="p-3 text-left">触发方式</th><th className="p-3 text-left">状态</th><th className="p-3 text-left">完成时间</th></tr></thead><tbody>{runs.map((run) => <tr key={run.run_id} className="border-t border-[var(--border-color)]"><td className="p-3">{new Date(run.started_at).toLocaleString('zh-CN')}</td><td className="p-3">{run.trigger}</td><td className="p-3 text-[var(--accent)]">{run.status}</td><td className="p-3">{run.finished_at ? new Date(run.finished_at).toLocaleString('zh-CN') : '-'}</td></tr>)}</tbody></table></div>
    </div>
  </div>;
};
