import React, { useState, useRef, useEffect } from 'react';
import { THEME_OPTIONS, ThemeId, applyTheme } from '../theme';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeThemeObj = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTheme = (id: ThemeId) => {
    onThemeChange(id);
    applyTheme(id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[#888888] hover:text-[var(--accent)] hover:bg-[#1A1A1A] rounded-full transition-colors relative cursor-pointer flex items-center gap-1.5 border border-transparent hover:border-white/10"
        title="切换界面主题 (Theme)"
      >
        <span className="material-symbols-outlined text-[20px]">palette</span>
        <span
          className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-sm"
          style={{ backgroundColor: activeThemeObj.accentColor }}
        ></span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#141414] border border-white/15 rounded-sm shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-serif-editorial font-bold text-[var(--text-primary)] tracking-wider uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[var(--accent)]">palette</span>
              <span>主题配色 ({THEME_OPTIONS.length}款)</span>
            </span>
            <span className="text-[10px] font-data-mono text-[#888888]">{activeThemeObj.name}</span>
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
            {THEME_OPTIONS.map((theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1A1A1A] border border-[var(--accent)] text-[#E5E5E5]'
                      : 'hover:bg-[#1A1A1A] border border-transparent text-[#888888] hover:text-[#E5E5E5]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Theme Preview Dot */}
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner"
                      style={{ backgroundColor: theme.bgColor }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: theme.accentColor }}
                      ></div>
                    </div>

                    <div>
                      <div className="text-xs font-serif-editorial font-bold flex items-center gap-1.5">
                        <span>{theme.name}</span>
                        {theme.isLight && (
                          <span className="text-[9px] font-data-mono bg-[#8C6D46]/20 text-[#8C6D46] px-1 rounded">
                            Light
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-data-mono opacity-60">{theme.subName}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="material-symbols-outlined text-sm text-[var(--accent)] font-bold">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
