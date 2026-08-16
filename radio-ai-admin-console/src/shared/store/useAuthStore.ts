import { create } from 'zustand';
import { API_BASE_URL } from '../api/client';

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoginModalOpen: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  setError: (err: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('radio_ai_admin_token'),
  username: localStorage.getItem('radio_ai_admin_user') || (localStorage.getItem('radio_ai_admin_token') ? 'admin' : null),
  isAuthenticated: Boolean(localStorage.getItem('radio_ai_admin_token')),
  isLoading: false,
  isLoginModalOpen: false,
  error: null,

  openLoginModal: () => set({ isLoginModalOpen: true, error: null }),
  closeLoginModal: () => set({ isLoginModalOpen: false, error: null }),
  setError: (error: string | null) => set({ error }),

  login: async (username: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (!res.ok) {
        let msg = '登录失败，请检查用户名或密码';
        try {
          const data = await res.json();
          msg = data.detail || data.message || msg;
        } catch {
          // ignore non-json
        }
        set({ isLoading: false, error: msg });
        return false;
      }

      const data = (await res.json()) as { token: string; username: string };
      localStorage.setItem('radio_ai_admin_token', data.token);
      localStorage.setItem('radio_ai_admin_user', data.username);

      set({
        token: data.token,
        username: data.username,
        isAuthenticated: true,
        isLoading: false,
        isLoginModalOpen: false,
        error: null,
      });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e?.message || '网络通信异常' });
      return false;
    }
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/admin/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }
    localStorage.removeItem('radio_ai_admin_token');
    localStorage.removeItem('radio_ai_admin_user');
    set({
      token: null,
      username: null,
      isAuthenticated: false,
      isLoginModalOpen: false,
      error: null,
    });
  },

  checkAuth: async (): Promise<boolean> => {
    const token = get().token || localStorage.getItem('radio_ai_admin_token');
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/auth/me`, {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const user = data.user;
        const name = user?.username || 'admin';
        set({ isAuthenticated: true, username: name });
        localStorage.setItem('radio_ai_admin_user', name);
        return true;
      } else {
        // If expired or invalid
        if (token) {
          localStorage.removeItem('radio_ai_admin_token');
          localStorage.removeItem('radio_ai_admin_user');
          set({ token: null, username: null, isAuthenticated: false });
        }
        return false;
      }
    } catch {
      return Boolean(get().token);
    }
  },
}));
