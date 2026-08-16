import React, { useState, useRef, useEffect } from 'react';
import { ThemeSelector } from './ThemeSelector';
import { ThemeId } from '../theme';

interface HeaderProps {
  pageTitle: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isLiveRunning?: boolean;
  currentTheme: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
  onToggleMobileSidebar?: () => void;
  onOpenAtlasStudio?: () => void;
  onOpenApiKeySettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  searchQuery,
  onSearchChange,
  isLiveRunning = true,
  currentTheme,
  onThemeChange,
  onToggleMobileSidebar,
  onOpenAtlasStudio,
  onOpenApiKeySettings,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)] sticky top-0 z-40 flex justify-between items-center px-4 md:px-8 h-20 transition-colors duration-300">
      {/* Title & Live Status Indicator */}
      <div className="flex items-center gap-3 md:gap-6">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-[var(--text-primary)] hover:bg-[var(--bg-subcard)] rounded-sm cursor-pointer"
            title="切换导航栏"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
        )}
        <h2 className="text-lg md:text-xl font-serif-editorial font-bold text-[var(--text-primary)] tracking-wide">{pageTitle}</h2>
        <div className="h-5 w-px bg-[var(--border-color)] hidden sm:block"></div>
        <div className="hidden sm:flex items-center gap-2 text-[var(--accent)]">
          <div className={`w-2 h-2 rounded-full ${isLiveRunning ? 'bg-[var(--accent)] live-dot' : 'bg-gray-500'}`}></div>
          <span className="text-[11px] font-data-mono uppercase tracking-[0.15em]">
            {isLiveRunning ? '新闻编辑控制室在线' : '服务暂停'}
          </span>
        </div>
      </div>

      {/* Actions & Global Search */}
      <div className="flex items-center gap-4">
        <div className="relative w-64 hidden lg:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索广播特刊、文案或玩偶..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm py-1.5 pl-9 pr-4 text-xs font-data-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[var(--text-muted)] transition-all"
          />
        </div>

        <div className="flex items-center gap-1 relative" ref={settingsRef}>
          {/* Theme Selector Dropdown in top right corner */}
          <ThemeSelector currentTheme={currentTheme} onThemeChange={onThemeChange} />

          <button className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-subcard)] rounded-full transition-colors relative cursor-pointer" title="通知">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]"></span>
          </button>
          <button className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-subcard)] rounded-full transition-colors cursor-pointer" title="信号探测">
            <span className="material-symbols-outlined text-[20px]">sensors</span>
          </button>

          {/* Settings Icon & Dropdown Menu */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isSettingsOpen
                ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-subcard)]'
            }`}
            title="系统设置"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>

          {/* Settings Popover Menu */}
          {isSettingsOpen && (
            <div className="absolute right-0 top-12 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md shadow-2xl z-50 py-2 animate-fadeIn border-t-2 border-t-[var(--accent)]">
              <div className="px-4 py-2 text-[10px] font-data-mono text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                系统设置与工作台工具
              </div>

              {/* Menu Item: API Key Settings */}
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  if (onOpenApiKeySettings) onOpenApiKeySettings();
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 text-xs font-serif-editorial text-[var(--text-primary)] hover:bg-[var(--bg-subcard)] hover:text-[var(--accent)] border-b border-[var(--border-color)] transition-colors cursor-pointer group"
              >
                <span className="material-symbols-outlined text-lg text-[var(--accent)] group-hover:scale-110 transition-transform">
                  vpn_key
                </span>
                <div>
                  <div className="font-bold">系统 API Key 配置</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">配置 Gemini、TTS 语音及 Agent 密钥</div>
                </div>
              </button>

              {/* Menu Item: Atlas Studio */}
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  if (onOpenAtlasStudio) onOpenAtlasStudio();
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 text-xs font-serif-editorial text-[var(--text-primary)] hover:bg-[var(--bg-subcard)] hover:text-[var(--accent)] transition-colors cursor-pointer group"
              >
                <span className="material-symbols-outlined text-lg text-[var(--accent)] group-hover:scale-110 transition-transform">
                  crop
                </span>
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <span>图鉴抠图 Studio</span>
                    <span className="px-1.5 py-0.2 bg-[var(--accent)]/20 text-[var(--accent)] text-[9px] rounded font-mono">10X</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">全量玩偶动作图鉴漫游与抠图保存</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="w-9 h-9 rounded-full border border-[var(--accent)]/40 overflow-hidden ml-1 shrink-0">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUQomoKY-MiiMkslfgWRawHDQAYHyDwLpvYV_QcjT47SqDjgPpk9aCfB2WumegWGkrXhsW468SqWzfzYEaoWaSLYkedYmDdiMnxDGSEhsXzGiXisrh_i4qfJa3YXfmuWJkOnOX4EJrwAV13VtjfkpmiJXMJdRWYWk1IwwC9YinfY91ZQKPwUjltrXgFO0krZ-jJrUX7HBrBUTsgfX4c8Ln46_0a4rVJThsNyH9w0w9-moQEMrxvLFJ0Q"
            alt="User Avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};

