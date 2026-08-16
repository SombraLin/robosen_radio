import React, { useState, useEffect } from 'react';
import { BroadcastChainItem } from '../../types';

interface ChainPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainItems: BroadcastChainItem[];
}

export const ChainPreviewModal: React.FC<ChainPreviewModalProps> = ({
  isOpen,
  onClose,
  chainItems,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressSec, setProgressSec] = useState(0);

  const totalDuration = chainItems.reduce((acc, curr) => acc + curr.durationSeconds, 0);

  useEffect(() => {
    if (!isOpen || !isPlaying || chainItems.length === 0) return;

    const timer = setInterval(() => {
      setProgressSec((prev) => {
        if (prev >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, totalDuration, chainItems.length]);

  // Determine current playing item based on progressSec
  useEffect(() => {
    let accumulated = 0;
    for (let i = 0; i < chainItems.length; i++) {
      accumulated += chainItems[i].durationSeconds;
      if (progressSec <= accumulated) {
        setCurrentIndex(i);
        break;
      }
    }
  }, [progressSec, chainItems]);

  if (!isOpen) return null;

  const currentItem = chainItems[currentIndex] || chainItems[0];

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn select-none">
      <div className="bg-[var(--bg-card)] border border-[var(--accent)]/40 rounded-sm w-full max-w-2xl p-6 shadow-2xl space-y-6 relative transition-colors duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-sm transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
          <div className="w-10 h-10 rounded-sm bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">podcasts</span>
          </div>
          <div>
            <h3 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)]">试听特刊全流程链路</h3>
            <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
              全链路特刊模拟试听：片头音效 → 虚拟主播开场 → 新闻主体电讯
            </p>
          </div>
        </div>

        {/* Current Active Item Card */}
        <div className="bg-[var(--bg-primary)] p-5 rounded-sm border border-[var(--accent)]/30 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-data-mono text-[10px] text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-2.5 py-0.5 rounded-sm uppercase tracking-widest">
              正在播放 ({currentIndex + 1} / {chainItems.length}): {currentItem?.type === 'music' ? '片头音效' : currentItem?.type === 'voice' ? '虚拟主播' : '新闻播报'}
            </span>
            <span className="font-data-mono text-xs text-[var(--text-muted)]">
              {formatSec(progressSec)} / {formatSec(totalDuration)}
            </span>
          </div>

          <h4 className="text-base font-serif-editorial font-bold text-[var(--text-primary)]">{currentItem?.title}</h4>
          <p className="text-xs text-[var(--text-muted)] font-data-mono">{currentItem?.subtitle}</p>

          {/* Simulated Waveform Canvas */}
          <div className="h-12 bg-[var(--bg-subcard)] rounded-sm flex items-end justify-center gap-1.5 px-4 py-2 border border-[var(--border-color)] overflow-hidden">
            {[...Array(28)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 rounded-none transition-all ${
                  isPlaying ? 'bg-[var(--accent)] bar-3' : 'bg-[var(--border-color)]'
                }`}
                style={{
                  height: isPlaying ? `${Math.floor(Math.random() * 85) + 15}%` : '25%',
                }}
              ></div>
            ))}
          </div>

          {/* Scrub bar */}
          <div className="w-full h-1.5 bg-[var(--bg-subcard)] rounded-none overflow-hidden cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickRatio = (e.clientX - rect.left) / rect.width;
            setProgressSec(Math.floor(clickRatio * totalDuration));
          }}>
            <div
              className="h-full bg-[var(--accent)] rounded-none transition-all duration-300 shadow-[0_0_8px_rgba(163,142,109,0.5)]"
              style={{ width: `${(progressSec / (totalDuration || 1)) * 100}%` }}
            ></div>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center justify-center gap-6 pt-2">
            <button
              onClick={() => {
                if (currentIndex > 0) {
                  let accumulated = 0;
                  for (let i = 0; i < currentIndex - 1; i++) {
                    accumulated += chainItems[i].durationSeconds;
                  }
                  setProgressSec(accumulated);
                }
              }}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">skip_previous</span>
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 rounded-sm bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold"
            >
              <span className="material-symbols-outlined text-2xl">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <button
              onClick={() => {
                if (currentIndex < chainItems.length - 1) {
                  let accumulated = 0;
                  for (let i = 0; i <= currentIndex; i++) {
                    accumulated += chainItems[i].durationSeconds;
                  }
                  setProgressSec(accumulated);
                }
              }}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">skip_next</span>
            </button>
          </div>
        </div>

        {/* List of items in chain */}
        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {chainItems.map((item, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <div
                key={item.id}
                onClick={() => {
                  let accumulated = 0;
                  for (let i = 0; i < idx; i++) {
                    accumulated += chainItems[i].durationSeconds;
                  }
                  setProgressSec(accumulated);
                }}
                className={`p-3 rounded-sm border flex items-center justify-between text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--bg-subcard)] border-[var(--accent)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-color)]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-data-mono font-bold text-[10px] text-[var(--accent)] w-4">{idx + 1}</span>
                  <span className="font-serif-editorial font-semibold text-[var(--text-primary)]">{item.title}</span>
                </div>
                <span className="font-data-mono text-[11px]">{item.durationFormatted}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
