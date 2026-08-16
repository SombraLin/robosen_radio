import { create } from 'zustand';
import { requestJson, isRadioAiApiEnabled } from '../api/client';

interface ApiKeyState {
  dashscopeApiKey: string;
  geminiApiKey: string;
  isSettingsModalOpen: boolean;
  setDashscopeApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setSettingsModalOpen: (open: boolean) => void;
  loadFromStorageAndApi: () => Promise<void>;
  saveToServer: (key: string) => Promise<void>;
}

export const useApiKeyStore = create<ApiKeyState>((set) => ({
  dashscopeApiKey: '',
  geminiApiKey: '',
  isSettingsModalOpen: false,
  setDashscopeApiKey: (key: string) => set({ dashscopeApiKey: key }),
  setGeminiApiKey: (key: string) => set({ geminiApiKey: key }),
  setSettingsModalOpen: (open: boolean) => set({ isSettingsModalOpen: open }),
  loadFromStorageAndApi: async () => {
    if (isRadioAiApiEnabled()) {
      try {
        const cfg = await requestJson<{ dashscope_api_key?: string }>('/api/v1/radio-ai/generative-config');
        if (cfg && cfg.dashscope_api_key) {
          set({ dashscopeApiKey: cfg.dashscope_api_key });
        }
      } catch (e) {
        console.warn('获取服务端脱敏 API Key 失败:', e);
      }
    }
  },
  saveToServer: async (newKey: string) => {
    if (isRadioAiApiEnabled() && newKey.trim()) {
      try {
        const cfg = await requestJson<{ dashscope_api_key?: string }>('/api/v1/radio-ai/generative-config', {
          method: 'PUT',
          body: JSON.stringify({ dashscope_api_key: newKey.trim() }),
        });
        if (cfg && cfg.dashscope_api_key) {
          set({ dashscopeApiKey: cfg.dashscope_api_key });
        }
      } catch (e) {
        console.error('保存 API Key 到服务端失败:', e);
        throw e;
      }
    }
  },
}));
