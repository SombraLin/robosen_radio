import { create } from 'zustand';
import { AutomationStatusDto, AutomationRunDto } from './types';

interface AutomationState {
  status: AutomationStatusDto | null;
  runs: AutomationRunDto[];
  isLoading: boolean;
  error: string | null;

  setStatus: (status: AutomationStatusDto | null | ((prev: AutomationStatusDto | null) => AutomationStatusDto | null)) => void;
  setRuns: (runs: AutomationRunDto[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAutomationStore = create<AutomationState>((set) => ({
  status: null,
  runs: [],
  isLoading: false,
  error: null,

  setStatus: (updater) =>
    set((state) => ({
      status: typeof updater === 'function' ? updater(state.status) : updater,
    })),
  setRuns: (runs) => set({ runs }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
