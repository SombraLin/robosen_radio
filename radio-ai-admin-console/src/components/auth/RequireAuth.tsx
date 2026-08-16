import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../shared/store/useAuthStore';

export const RequireAuth: React.FC = () => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] font-serif-editorial">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-sm bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)] animate-pulse">
            <span className="material-symbols-outlined text-xl">radio</span>
          </div>
          <span className="font-bold text-lg tracking-wider">RADIO AI 导播台</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-data-mono text-[var(--text-muted)]">
          <span className="material-symbols-outlined text-base animate-spin text-[var(--accent)]">
            progress_activity
          </span>
          <span>正在校验管理员鉴权凭据…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
