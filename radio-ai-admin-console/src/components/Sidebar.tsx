import React from 'react';
import { ViewTab } from '../types';

interface SidebarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenNewBroadcast: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewBroadcast,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems: { id: ViewTab; label: string; icon: string; filledIcon?: boolean }[] = [
    { id: 'dashboard', label: '仪表盘', icon: 'dashboard' },
    { id: 'channels', label: '玩偶频道', icon: 'podcasts' },
    { id: 'automation', label: '自动化', icon: 'settings_input_component' },
    { id: 'audio', label: '音频库', icon: 'audio_file' },
    { id: 'device', label: '设备模拟器', icon: 'developer_board' },
    { id: 'logs', label: '实时日志', icon: 'terminal' },
    { id: 'trash', label: '回收站', icon: 'delete' },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fadeIn"
        />
      )}

      <aside
        className={`w-[280px] h-screen fixed left-0 top-0 bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col py-8 z-50 select-none transition-all duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-6 mb-8 border-b border-[var(--border-color)] pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)] font-serif-editorial font-bold text-xl shadow-md">
              境
            </div>
            <div>
              <h1 className="font-serif-editorial font-bold text-xl text-[var(--text-primary)] tracking-widest uppercase">RADIO AI</h1>
              <p className="text-[10px] text-[var(--accent)] font-data-mono uppercase tracking-[0.2em] mt-0.5">NO. 088 / 编辑导播套件</p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-150 text-left cursor-pointer border ${
                  isActive
                    ? 'bg-[var(--bg-subcard)] border-[var(--accent)]/50 text-[var(--accent)] font-bold shadow-sm'
                    : 'bg-transparent border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-subcard)]/80 hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                  style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                >
                  {item.icon}
                </span>
                <span className="text-xs font-serif-editorial tracking-wider">{item.label}</span>
              </button>
            );
          })}
        </nav>

      {/* CTA & Profile */}
      <div className="px-5 mt-auto pt-4 space-y-4">
        <button
          onClick={onOpenNewBroadcast}
          className="w-full py-3 px-4 bg-[var(--accent)] text-[var(--accent-text)] font-bold text-xs uppercase tracking-[0.15em] rounded-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span className="font-serif-editorial">新建播报特刊</span>
        </button>

        <div className="flex items-center gap-3 p-3 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)]">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAB6jl8yMYGKDFKi_PR1JmuSsBDOJ8SiBXhleirP_cIL-FRHG3mkmvnDT2T1o_RilbGmJ7rNpjJJe9FyIRzXv_XtJfukXAV43KbTwmYIkQynL5lBOUp_N-EZiKJMR2xgeH8aMJjDr_IdoKXiLY1t6Xhkp9ZgZC4kmGwENW1kQdK0Qy_STPNh8HuEfy7ZJ-FVFGB1pU64IBiFFTr3ZJQbTlCbaal9xwsTUCtdQRY3t7iICAgeBi0ANrh-w"
            alt="Admin Profile"
            className="w-8 h-8 rounded-full object-cover border border-[var(--accent)]/40"
          />
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate font-serif-editorial">广播导播台</p>
            <p className="text-[10px] text-[var(--accent)] font-data-mono truncate uppercase tracking-widest">总编室</p>
          </div>
        </div>
      </div>
    </aside>
  </>
);
};

