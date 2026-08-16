import { useCallback } from 'react';
import { useAutomationStore } from './store';
import { isRadioAiApiEnabled } from '../../shared/api/client';
import {
  getAutomationStatus,
  updateAutomationConfig,
  updateAutomationState,
  getAutomationRuns,
  triggerManualRun,
} from './api';
import { AutomationConfigDto } from './types';

export function useAutomationActions() {
  const { status, runs, setStatus, setRuns, setLoading, setError } = useAutomationStore();

  const loadStatus = useCallback(async () => {
    if (!isRadioAiApiEnabled()) return;
    setLoading(true);
    try {
      const data = await getAutomationStatus();
      setStatus(data);
    } catch (e: any) {
      console.error('获取自动化状态失败:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [setStatus, setLoading, setError]);

  const loadRuns = useCallback(async () => {
    if (!isRadioAiApiEnabled()) return;
    try {
      const data = await getAutomationRuns(1, 20);
      setRuns(data.items || []);
    } catch (e) {
      console.warn('获取自动化执行历史失败:', e);
    }
  }, [setRuns]);

  const toggleEnabled = useCallback(
    async (enabled: boolean) => {
      if (isRadioAiApiEnabled()) {
        await updateAutomationState(enabled);
        await loadStatus();
      }
    },
    [loadStatus]
  );

  const saveConfig = useCallback(
    async (config: Partial<AutomationConfigDto>) => {
      if (isRadioAiApiEnabled()) {
        const updated = await updateAutomationConfig(config);
        setStatus((prev) => (prev ? { ...prev, config: updated } : null));
      }
    },
    [setStatus]
  );

  const triggerRun = useCallback(
    async (payload: any) => {
      if (isRadioAiApiEnabled()) {
        const res = await triggerManualRun(payload);
        await loadRuns();
        await loadStatus();
        return res;
      }
    },
    [loadRuns, loadStatus]
  );

  return {
    status,
    runs,
    loadStatus,
    loadRuns,
    toggleEnabled,
    saveConfig,
    triggerRun,
  };
}
