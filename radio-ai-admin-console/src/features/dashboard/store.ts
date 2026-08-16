import { create } from 'zustand';
import { ModuleDiagnosticResult, SystemHealthStatusResponse } from './types';
import { getSystemHealthStatusApi, runModuleDiagnosticApi } from './api';
import { isRadioAiApiEnabled } from '../../shared/api/client';

interface DashboardHealthState {
  healthStatus: SystemHealthStatusResponse | null;
  testingModules: Record<string, boolean>;
  activeDiagnosticResult: ModuleDiagnosticResult | null;
  isDiagnosticModalOpen: boolean;
  isDiagnosingAll: boolean;
  isLoading: boolean;
  error: string | null;

  setHealthStatus: (status: SystemHealthStatusResponse | null) => void;
  setActiveDiagnosticResult: (res: ModuleDiagnosticResult | null) => void;
  setIsDiagnosticModalOpen: (open: boolean) => void;
  loadHealthStatus: () => Promise<void>;
  runSingleModuleDiagnose: (moduleId: string) => Promise<ModuleDiagnosticResult | null>;
  runAllModulesDiagnose: () => Promise<void>;
}

export const useDashboardHealthStore = create<DashboardHealthState>((set, get) => ({
  healthStatus: null,
  testingModules: {},
  activeDiagnosticResult: null,
  isDiagnosticModalOpen: false,
  isDiagnosingAll: false,
  isLoading: false,
  error: null,

  setHealthStatus: (healthStatus) => set({ healthStatus }),
  setActiveDiagnosticResult: (activeDiagnosticResult) =>
    set({ activeDiagnosticResult, isDiagnosticModalOpen: Boolean(activeDiagnosticResult) }),
  setIsDiagnosticModalOpen: (isDiagnosticModalOpen) =>
    set({ isDiagnosticModalOpen, activeDiagnosticResult: isDiagnosticModalOpen ? get().activeDiagnosticResult : null }),

  loadHealthStatus: async () => {
    if (!isRadioAiApiEnabled()) return;
    set({ isLoading: true, error: null });
    try {
      const data = await getSystemHealthStatusApi();
      set({ healthStatus: data });
    } catch (e: any) {
      console.warn('获取系统健康状态失败:', e);
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  runSingleModuleDiagnose: async (moduleId: string) => {
    set((state) => ({
      testingModules: { ...state.testingModules, [moduleId]: true },
    }));
    try {
      const res = await runModuleDiagnosticApi(moduleId);
      if (res.result) {
        // Update specific module in store
        set((state) => {
          if (!state.healthStatus) return state;
          const nextModules = state.healthStatus.modules.map((m) =>
            m.module_id === moduleId ? res.result! : m
          );
          return {
            healthStatus: {
              ...state.healthStatus,
              modules: nextModules,
            },
            activeDiagnosticResult: res.result,
            isDiagnosticModalOpen: true,
          };
        });
        return res.result;
      }
      return null;
    } catch (e: any) {
      console.error(`诊断模块 ${moduleId} 失败:`, e);
      const errorResult: ModuleDiagnosticResult = {
        module_id: moduleId,
        module_name: moduleId,
        status: 'error',
        latency_ms: 0,
        tested_at: new Date().toLocaleTimeString(),
        summary: `请求诊断接口失败: ${e.message}`,
        root_cause: e.message,
        actionable_remedy: '请检查后端服务运行状态或网络连通性。',
      };
      set({ activeDiagnosticResult: errorResult, isDiagnosticModalOpen: true });
      return errorResult;
    } finally {
      set((state) => ({
        testingModules: { ...state.testingModules, [moduleId]: false },
      }));
    }
  },

  runAllModulesDiagnose: async () => {
    set({ isDiagnosingAll: true });
    try {
      const res = await runModuleDiagnosticApi();
      if (res.results) {
        const healthy = res.results.filter((r) => r.status === 'healthy').length;
        const warning = res.results.filter((r) => r.status === 'warning').length;
        const error = res.results.filter((r) => r.status === 'error').length;
        const total = res.results.length;
        const healthScore = total > 0 ? Math.round((healthy * 100 + warning * 70) / total) : 100;
        const overallStatus = error > 0 ? (error >= 3 ? 'down' : 'degraded') : warning > 0 ? 'degraded' : 'healthy';

        set({
          healthStatus: {
            overall_status: overallStatus,
            health_score: healthScore,
            healthy_count: healthy,
            warning_count: warning,
            error_count: error,
            checked_at: new Date().toLocaleString(),
            modules: res.results,
          },
        });
      }
    } catch (e: any) {
      console.error('全模块自检失败:', e);
    } finally {
      set({ isDiagnosingAll: false });
    }
  },
}));
