import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../shared/store/useAuthStore';

export const LoginModal: React.FC = () => {
  const isOpen = useAuthStore((s) => s.isLoginModalOpen);
  const close = useAuthStore((s) => s.closeLoginModal);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUsername = useAuthStore((s) => s.username);
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);
  const setError = useAuthStore((s) => s.setError);

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123456');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!username) setUsername('admin');
      if (!password) setPassword('admin123456');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    const success = await login(username.trim(), password.trim());
    if (success) {
      // Login succeeded, modal will be closed by store
    }
  };

  const handleQuickFill = () => {
    setUsername('admin');
    setPassword('admin123456');
    setError(null);
  };

  const handleLogout = async () => {
    await logout();
    setUsername('admin');
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm shadow-2xl overflow-hidden border-t-2 border-t-[var(--accent)]">
        {/* Header */}
        <div className="p-5 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--accent)] text-lg">
                admin_panel_settings
              </span>
              <span className="font-data-mono text-[10px] text-[var(--accent)] uppercase font-bold tracking-widest">
                RADIO AI 导播权限鉴权
              </span>
            </div>
            <h2 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)] mt-1">
              {isAuthenticated ? '管理员身份与账号管理' : '管理员身份登录'}
            </h2>
          </div>
          <button
            onClick={close}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer rounded-sm hover:bg-[var(--bg-subcard)]"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 font-sans">
          {/* Current Auth Status Card */}
          <div className="p-3.5 bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm flex items-center justify-between text-xs font-data-mono">
            <div className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full ${isAuthenticated ? 'bg-green-500 live-dot' : 'bg-amber-500'}`} />
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">鉴权凭据状态</div>
                <div className="font-bold text-[var(--text-primary)]">
                  {isAuthenticated ? `已登录: ${currentUsername || 'admin'}` : '未登录 (部分写操作受限)'}
                </div>
              </div>
            </div>
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1 text-[11px] border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-sm cursor-pointer transition-colors"
              >
                退出登录
              </button>
            )}
          </div>

          {storeError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-400 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{storeError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-serif-editorial font-bold text-[var(--text-primary)] mb-1.5">
                管理员账号
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm py-2 pl-9 pr-3 text-xs font-data-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-serif-editorial font-bold text-[var(--text-primary)] mb-1.5">
                登录密码
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm py-2 pl-9 pr-9 text-xs font-data-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Fill Preset */}
            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-[11px] text-[var(--accent)] hover:underline font-data-mono cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">bolt</span>
                <span>填入默认凭据 (admin / admin123456)</span>
              </button>
            </div>

            {/* Submit Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={close}
                className="flex-1 py-2.5 border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold rounded-sm cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial font-bold text-xs rounded-sm hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    <span>正在鉴权…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">login</span>
                    <span>{isAuthenticated ? '切换并重新登录' : '立即登录'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
