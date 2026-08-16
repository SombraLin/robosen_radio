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
}

export const useApiKeyStore = create<ApiKeyState>((set) => ({
  dashscopeApiKey:
    localStorage.getItem('RADIO_AI_DASHSCOPE_API_KEY') ||
    localStorage.getItem('dashscope_api_key') ||
    '',
  geminiApiKey:
    localStorage.getItem('RADIO_AI_GEMINI_API_KEY') ||
    localStorage.getItem('gemini_api_key') ||
    '',
  isSettingsModalOpen: false,
  setDashscopeApiKey: (key: string) => {
    try {
      localStorage.setItem('RADIO_AI_DASHSCOPE_API_KEY', key);
      localStorage.setItem('dashscope_api_key', key);
    } catch (e) {
      console.error('Failed to save dashscopeApiKey:', e);
    }
    set({ dashscopeApiKey: key });
  },
  setGeminiApiKey: (key: string) => {
    try {
      localStorage.setItem('RADIO_AI_GEMINI_API_KEY', key);
      localStorage.setItem('gemini_api_key', key);
    } catch (e) {
      console.error('Failed to save geminiApiKey:', e);
    }
    set({ geminiApiKey: key });
  },
  setSettingsModalOpen: (open: boolean) => set({ isSettingsModalOpen: open }),
  loadFromStorageAndApi: async () => {
    if (isRadioAiApiEnabled()) {
      try {
        const cfg = await requestJson<any>('/api/v1/radio-ai/generative-config');
        if (cfg && cfg.dashscope_api_key) {
          set({ dashscopeApiKey: cfg.dashscope_api_key });
          localStorage.setItem('RADIO_AI_DASHSCOPE_API_KEY', cfg.dashscope_api_key);
        }
      } catch (e) {
        console.warn('获取服务端 API Key 失败:', e);
      }
    }
  },
}));
