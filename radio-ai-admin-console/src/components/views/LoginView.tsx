import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../shared/store/useAuthStore';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);
  const setError = useAuthStore((s) => s.setError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/channels';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('请输入管理员账号');
      return;
    }
    if (!password.trim()) {
      setError('请输入登录密码');
      return;
    }

    const success = await login(username.trim(), password.trim());
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] font-serif-editorial p-4 relative overflow-hidden select-none">
      {/* Background Decorative Gradients & Frequency Waves */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm shadow-2xl overflow-hidden border-t-2 border-t-[var(--accent)] relative z-10 animate-fadeIn">
        {/* Header / Brand */}
        <div className="p-8 pb-6 text-center border-b border-[var(--border-color)]/60 bg-[var(--bg-card)]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-sm bg-[var(--accent)] text-[var(--accent-text)] shadow-lg mb-4">
            <span className="material-symbols-outlined text-3xl">radio</span>
          </div>
          <h1 className="text-2xl font-bold font-serif-editorial tracking-wide text-[var(--text-primary)]">
            RADIO AI 导播总控台
          </h1>
          <p className="text-xs text-[var(--accent)] font-data-mono uppercase tracking-[0.2em] mt-1.5 font-bold">
            玩偶互动频道 · 智能全链路工作台
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-data-mono text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] live-dot" />
            <span>系统安全鉴权网关已开启</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6 font-sans">
          {storeError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-sm text-red-400 text-xs flex items-center gap-2.5 animate-fadeIn">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{storeError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-serif-editorial font-bold text-[var(--text-primary)] mb-2 tracking-wide">
                管理员账号
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-base">
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (storeError) setError(null);
                  }}
                  placeholder="请输入管理员账号"
                  autoFocus
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm py-2.5 pl-10 pr-3.5 text-sm font-data-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-muted)]/60"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-serif-editorial font-bold text-[var(--text-primary)] mb-2 tracking-wide">
                登录密码
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-base">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (storeError) setError(null);
                  }}
                  placeholder="请输入密码"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm py-2.5 pl-10 pr-10 text-sm font-data-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-muted)]/60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1"
                  title={showPassword ? '隐藏密码' : '显示密码'}
                >
                  <span className="material-symbols-outlined text-base">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial font-bold text-sm tracking-wider rounded-sm hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    <span>正在鉴权登录…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">login</span>
                    <span>进入导播工作台</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Note */}
        <div className="px-8 py-4 bg-[var(--bg-subcard)] border-t border-[var(--border-color)]/60 text-center font-data-mono text-[11px] text-[var(--text-muted)]">
          RADIO AI 全链路玩偶广播总控室 · 请使用管理员凭据安全访问
        </div>
      </div>
    </div>
  );
};
