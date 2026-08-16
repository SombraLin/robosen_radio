import React from 'react';
import { NavLink } from 'react-router-dom';
import { useNewsStore } from '../features/news-console/store';
import { useAuthStore } from '../shared/store/useAuthStore';

interface SidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: any) => void;
  onOpenNewBroadcast?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile = false,
  onCloseMobile,
  onOpenNewBroadcast,
}) => {
  const setIsNewBroadcastOpen = useNewsStore((s) => s.setIsNewBroadcastOpen);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.username);
  const openLoginModal = useAuthStore((s) => s.openLoginModal);

  const handleOpenNewBroadcast = () => {
    if (onOpenNewBroadcast) {
      onOpenNewBroadcast();
    } else {
      setIsNewBroadcastOpen(true);
    }
  };

  const navItems = [
    { path: '/dashboard', label: '仪表盘', icon: 'dashboard' },
    { path: '/channels', label: '玩偶频道', icon: 'podcasts' },
    { path: '/news', label: '新闻控制台', icon: 'newspaper' },
    { path: '/automation', label: '自动化', icon: 'settings_input_component' },
    { path: '/audio', label: '音频库', icon: 'audio_file' },
    { path: '/device', label: '设备模拟器', icon: 'developer_board' },
    { path: '/ai-config', label: 'AI 与音色配置', icon: 'tune' },
    { path: '/logs', label: '实时日志', icon: 'terminal' },
    { path: '/trash', label: '回收站', icon: 'delete' },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-[280px] bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col justify-between py-6 z-50 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)] shadow-md">
              <span className="material-symbols-outlined text-2xl">radio</span>
            </div>
            <div>
              <h1 className="font-serif-editorial text-lg font-bold tracking-wider text-[var(--text-primary)] leading-tight">
                RADIO AI
              </h1>
              <p className="text-[10px] text-[var(--accent)] font-data-mono uppercase tracking-[0.2em]">
                导播与智能频道总控
              </p>
            </div>
          </div>

          {/* Close Button for Mobile */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="px-3 py-1.5 text-[10px] font-data-mono text-[var(--text-muted)] uppercase tracking-wider">
            控制台模块
          </div>
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3 py-2.5 rounded-sm transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-l-2 border-[var(--accent)] font-bold shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subcard)]'
                  }`
                }
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                >
                  {item.icon}
                </span>
                <span className="text-xs font-serif-editorial tracking-wider">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* CTA & Profile */}
        <div className="px-5 mt-auto pt-4 space-y-3">
          <button
            onClick={handleOpenNewBroadcast}
            className="w-full py-3 px-4 bg-[var(--accent)] text-[var(--accent-text)] font-bold text-xs uppercase tracking-[0.15em] rounded-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span className="font-serif-editorial">新建播报特刊</span>
          </button>

          {/* User Status Card */}
          <div
            onClick={openLoginModal}
            className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)]/60 cursor-pointer transition-all group"
            title="点击管理管理员身份与登录凭据"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAB6jl8yMYGKDFKi_PR1JmuSsBDOJ8SiBXhleirP_cIL-FRHG3mkmvnDT2T1o_RilbGmJ7rNpjJJe9FyIRzXv_XtJfukXAV43KbTwmYIkQynL5lBOUp_N-EZiKJMR2xgeH8aMJjDr_IdoKXiLY1t6Xhkp9ZgZC4kmGwENW1kQdK0Qy_STPNh8HuEfy7ZJ-FVFGB1pU64IBiFFTr3ZJQbTlCbaal9xwsTUCtdQRY3t7iICAgeBi0ANrh-w"
                  alt="Admin Profile"
                  className="w-8 h-8 rounded-full object-cover border border-[var(--accent)]/40"
                />
                <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[var(--bg-card)] ${isAuthenticated ? 'bg-green-500' : 'bg-amber-500'}`} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate font-serif-editorial group-hover:text-[var(--accent)] transition-colors">
                  {isAuthenticated ? (username || 'admin') : '未登录导播台'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] font-data-mono truncate uppercase tracking-widest">
                  {isAuthenticated ? '超级管理员 · 总编室' : '点击登录管理员'}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[var(--text-muted)] group-hover:text-[var(--accent)] text-sm transition-colors">
              {isAuthenticated ? 'more_vert' : 'login'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
