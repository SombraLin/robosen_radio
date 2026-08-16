import React, { useState } from 'react';
import { AudioAssetItem, AudioCategory, AudioType, Doll } from '../../types';
import { playSynthPreset, stopCurrentSynth } from '../../utils/audioSynth';
import { AudioEditorModal } from '../modals/AudioEditorModal';
import { AssignToChannelModal } from '../modals/AssignToChannelModal';

interface AudioAssetsViewProps {
  assets: AudioAssetItem[];
  dolls?: Doll[];
  onAddAsset?: (asset: AudioAssetItem) => void;
  onUpdateAsset?: (asset: AudioAssetItem) => void;
  onDeleteAsset?: (id: string) => void;
  onAssignToChannel?: (assetId: string, dollId: string, channelId: string, itemType: 'intro' | 'transition' | 'outro' | 'music_track') => void;
}

const ALL_CHANNEL_CATEGORIES: (AudioCategory | 'ALL')[] = [
  'ALL',
  '新闻频道',
  '天气频道',
  '电子宠物频道',
  '故事频道',
  '音乐频道',
  '剧场频道',
  '学习频道',
  '系统通用'
];

const ALL_AUDIO_TYPES: (AudioType | 'ALL')[] = [
  'ALL',
  '片头',
  '转场音效',
  '背景音乐',
  '事件提示音',
  '原声曲目',
  '片尾谢幕'
];

export const AudioAssetsView: React.FC<AudioAssetsViewProps> = ({
  assets,
  dolls = [],
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onAssignToChannel,
}) => {
  const [activeCategoryTab, setActiveCategoryTab] = useState<AudioCategory | 'ALL'>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<AudioType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [playingId, setPlayingId] = useState<string | null>(null);

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AudioAssetItem | null>(null);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigningAsset, setAssigningAsset] = useState<AudioAssetItem | null>(null);

  // Filter Assets Logic
  const filteredAssets = assets.filter((item) => {
    // 1. Channel Category Filter
    if (activeCategoryTab !== 'ALL') {
      const itemCat = item.channelCategory || item.category;
      if (itemCat !== activeCategoryTab) {
        return false;
      }
    }

    // 2. Audio Type Filter
    if (selectedTypeFilter !== 'ALL') {
      if (item.audioType !== selectedTypeFilter) {
        return false;
      }
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchCategory = (item.channelCategory || item.category || '').toLowerCase().includes(query);
      const matchType = (item.audioType || '').toLowerCase().includes(query);
      const matchSource = (item.speakerOrSource || '').toLowerCase().includes(query);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(query));
      const matchChannels = item.usedInChannels ? item.usedInChannels.some((c) => c.toLowerCase().includes(query)) : false;

      if (!matchTitle && !matchCategory && !matchType && !matchSource && !matchTags && !matchChannels) {
        return false;
      }
    }

    return true;
  });

  const currentAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // Stop any ongoing audio play (HTMLAudio or Web Audio Synth)
  const stopAllAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    stopCurrentSynth();
  };

  // Handle Play/Pause: Priority to HTMLAudioElement (item.url), fallback to Web Audio Synthesizer
  const togglePlay = (item: AudioAssetItem) => {
    if (playingId === item.id) {
      stopAllAudio();
      setPlayingId(null);
      return;
    }

    stopAllAudio();
    setPlayingId(item.id);

    if (item.url) {
      const audio = new Audio(item.url);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingId(null);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        // Fallback to synth if URL fails to load
        currentAudioRef.current = null;
        playSynthPreset(item.synthPreset || 'jingle', item.durationSeconds || 4);
        const durationMs = (item.durationSeconds || 4) * 1000;
        setTimeout(() => {
          setPlayingId((current) => (current === item.id ? null : current));
        }, Math.min(durationMs, 5000));
      };

      audio.play().catch(() => {
        currentAudioRef.current = null;
        playSynthPreset(item.synthPreset || 'jingle', item.durationSeconds || 4);
        const durationMs = (item.durationSeconds || 4) * 1000;
        setTimeout(() => {
          setPlayingId((current) => (current === item.id ? null : current));
        }, Math.min(durationMs, 5000));
      });
    } else {
      playSynthPreset(item.synthPreset || 'jingle', item.durationSeconds || 4);
      const durationMs = (item.durationSeconds || 4) * 1000;
      setTimeout(() => {
        setPlayingId((current) => (current === item.id ? null : current));
      }, Math.min(durationMs, 5000));
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: AudioAssetItem) => {
    setEditingAsset(item);
    setIsEditorOpen(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAsset(null);
    setIsEditorOpen(true);
  };

  // Open Assign Modal
  const handleOpenAssign = (item: AudioAssetItem) => {
    setAssigningAsset(item);
    setIsAssignOpen(true);
  };

  // Category Badge Colors
  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case '新闻频道':
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case '天气频道':
        return 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30';
      case '电子宠物频道':
        return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      case '故事频道':
        return 'bg-purple-500/15 text-purple-500 border-purple-500/30';
      case '音乐频道':
        return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
      case '剧场频道':
        return 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30';
      case '学习频道':
        return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
      default:
        return 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30';
    }
  };

  // Calculate Type Statistics
  const typeCounts = ALL_AUDIO_TYPES.reduce((acc, type) => {
    if (type === 'ALL') {
      acc[type] = assets.length;
    } else {
      acc[type] = assets.filter((a) => a.audioType === type).length;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto space-y-6 md:space-y-8 animate-fadeIn transition-colors duration-300">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-2xl text-[var(--accent)]">audio_file</span>
            <h2 className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)] tracking-wide">
              非TTS音频资产库
            </h2>
          </div>
          <p className="text-xs font-serif-editorial text-[var(--text-muted)] max-w-3xl leading-relaxed">
            集中分类管理各频道使用的非TTS配乐、片头、过场音效及背景音乐。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switch */}
          <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] p-1 rounded-sm flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-sm text-xs font-serif-editorial flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="网格画廊视图"
            >
              <span className="material-symbols-outlined text-sm">grid_view</span>
              <span>画廊</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-sm text-xs font-serif-editorial flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="明细数据表视图"
            >
              <span className="material-symbols-outlined text-sm">view_list</span>
              <span>列表</span>
            </button>
          </div>

          {/* Add Audio Asset CTA */}
          <button
            onClick={handleOpenCreate}
            className="bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 font-serif-editorial font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            <span>+ 新增音频</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-sm flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-sm bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">library_music</span>
          </div>
          <div>
            <div className="text-[10px] font-data-mono text-[var(--text-muted)] uppercase tracking-wider">音频总量</div>
            <div className="text-xl font-data-mono font-bold text-[var(--text-primary)]">{assets.length} <span className="text-xs font-serif-editorial text-[var(--text-muted)]">首</span></div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-sm flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-sm bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">podcasts</span>
          </div>
          <div>
            <div className="text-[10px] font-data-mono text-[var(--text-muted)] uppercase tracking-wider">覆盖频道</div>
            <div className="text-xl font-data-mono font-bold text-[var(--text-primary)]">6 <span className="text-xs font-serif-editorial text-[var(--text-muted)]">大类</span></div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-sm flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-sm bg-cyan-500/15 border border-cyan-500/30 text-cyan-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">queue_music</span>
          </div>
          <div>
            <div className="text-[10px] font-data-mono text-[var(--text-muted)] uppercase tracking-wider">类型分布</div>
            <div className="text-xs font-data-mono font-bold text-[var(--text-primary)] flex gap-2">
              <span>片头 {typeCounts['片头'] || 0}</span>
              <span>BGM {typeCounts['背景音乐'] || 0}</span>
              <span>转场 {typeCounts['转场音效'] || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-sm flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-sm bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">graphic_eq</span>
          </div>
          <div>
            <div className="text-[10px] font-data-mono text-[var(--text-muted)] uppercase tracking-wider">音频引擎</div>
            <div className="text-xs font-serif-editorial font-bold text-emerald-500 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>支持在线试听</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories & Filter Controls Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-sm space-y-4 shadow-xs">
        {/* Row 1: Channel Category Tabs */}
        <div>
          <div className="text-[10px] font-data-mono uppercase text-[var(--accent)] tracking-widest mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">category</span>
            <span>频道分类:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ALL_CHANNEL_CATEGORIES.map((cat) => {
              const isActive = activeCategoryTab === cat;
              const count = cat === 'ALL' ? assets.length : assets.filter((a) => (a.channelCategory || a.category) === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryTab(cat)}
                  className={`px-3.5 py-1.5 rounded-sm text-xs font-serif-editorial transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] font-bold shadow-xs'
                      : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <span>{cat === 'ALL' ? '全部频道' : cat}</span>
                  <span className={`text-[10px] font-data-mono px-1.5 py-0.2 rounded ${isActive ? 'bg-black/20 text-white' : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[var(--border-color)]/60 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Row 2: Audio Function Type Select */}
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="text-[10px] font-data-mono uppercase text-[var(--text-muted)] shrink-0">功能类型:</span>
            <div className="flex items-center gap-1.5">
              {ALL_AUDIO_TYPES.map((type) => {
                const isActive = selectedTypeFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedTypeFilter(type)}
                    className={`px-2.5 py-1 rounded-sm text-[11px] font-serif-editorial transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/50 font-bold'
                        : 'bg-transparent text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {type === 'ALL' ? '全部类型' : type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Search Input */}
          <div className="relative w-full md:w-72 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[var(--text-muted)] text-sm">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索音频名称、标签、频道..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm pl-9 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-serif-editorial"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Display (Grid or Table) */}
      {filteredAssets.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-12 text-center rounded-sm space-y-3">
          <span className="material-symbols-outlined text-4xl text-[var(--text-muted)]">music_off</span>
          <p className="font-serif-editorial text-sm text-[var(--text-muted)]">
            没有符合条件的非TTS音频资产。尝试调整分类筛选或新增音频。
          </p>
          <button
            onClick={() => {
              setActiveCategoryTab('ALL');
              setSelectedTypeFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-1.5 bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--accent)] text-xs rounded-sm font-bold cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all"
          >
            重置所有筛选
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID GALLERY VIEW - 卡片：名称 + 频道类别 + 音效类别 + 试听 + 编辑 + 删除 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssets.map((item) => {
            const isPlaying = playingId === item.id;
            const categoryLabel = item.channelCategory || item.category;

            return (
              <div
                key={item.id}
                className={`bg-[var(--bg-card)] border rounded-sm p-5 flex flex-col justify-between gap-4 transition-all ${
                  isPlaying
                    ? 'border-[var(--accent)] shadow-[0_0_20px_rgba(163,142,109,0.25)] ring-1 ring-[var(--accent)]/50'
                    : 'border-[var(--border-color)] hover:border-[var(--accent)]/50 hover:shadow-sm'
                }`}
              >
                <div className="space-y-3">
                  {/* 1. 频道类别 & 音效类别 Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`font-data-mono text-[10px] uppercase border px-2 py-0.5 rounded-sm tracking-wider font-bold ${getCategoryColor(
                        categoryLabel
                      )}`}
                    >
                      {categoryLabel}
                    </span>
                    <span className="font-data-mono text-[10px] text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-sm border border-[var(--accent)]/20 font-bold">
                      {item.audioType || '音效'}
                    </span>
                  </div>

                  {/* 2. 名称 */}
                  <div className="space-y-2">
                    <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] leading-snug line-clamp-2 break-words">
                      {item.title}
                    </h3>
                    {item.sourceText && (
                      <div className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-subcard)] p-2 rounded-sm border border-[var(--border-color)] line-clamp-2 break-words" title={item.sourceText}>
                        <span className="material-symbols-outlined text-[12px] inline-block align-middle mr-1 text-[var(--accent)]">record_voice_over</span>
                        {item.sourceText}
                      </div>
                    )}
                    {item.usedInChannels && item.usedInChannels.length > 0 && (
                      <div className="text-[10px] text-[var(--accent)] font-data-mono flex items-center gap-1 flex-wrap bg-[var(--accent)]/10 p-1.5 rounded-sm border border-[var(--accent)]/20">
                        <span className="material-symbols-outlined text-xs">link</span>
                        <span className="font-bold">已绑定: {item.usedInChannels.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. 试听 + 4. 分配/编辑/删除 操作行 */}
                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2 flex-wrap">
                  {/* 试听按钮 */}
                  <button
                    onClick={() => togglePlay(item)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-serif-editorial flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isPlaying
                        ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] font-bold shadow-xs'
                        : 'bg-[var(--bg-subcard)] text-[var(--text-primary)] hover:border-[var(--accent)] border border-[var(--border-color)]'
                    }`}
                    title={isPlaying ? '暂停试听' : '点击试听非TTS音效'}
                  >
                    <span className="material-symbols-outlined text-base">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{isPlaying ? '暂停' : '试听'}</span>
                  </button>

                  {/* 分配、编辑与删除按钮组 */}
                  <div className="flex items-center gap-1.5">
                    {/* 分配按钮 */}
                    <button
                      onClick={() => handleOpenAssign(item)}
                      className="px-2.5 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/15 rounded-sm transition-colors cursor-pointer flex items-center gap-1 font-serif-editorial border border-[var(--accent)]/30"
                      title="分配到玩偶频道播放节点"
                    >
                      <span className="material-symbols-outlined text-base">link</span>
                      <span>分配</span>
                    </button>

                    {/* 编辑按钮 */}
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subcard)] rounded-sm transition-colors cursor-pointer flex items-center gap-1 font-serif-editorial border border-[var(--border-color)]"
                      title="编辑音频资产"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      <span>编辑</span>
                    </button>

                    {/* 删除按钮 */}
                    {onDeleteAsset && (
                      <button
                        onClick={() => {
                          if (confirm(`确定要删除音频资产 "${item.title}" 吗？`)) {
                            onDeleteAsset(item.id);
                          }
                        }}
                        className="px-2 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-sm transition-colors cursor-pointer flex items-center gap-1 font-serif-editorial border border-red-500/20"
                        title="删除音频资产"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW - 列表：名称 + 频道类别 + 音效类别 + 试听 + 操作 */
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-serif-editorial">
              <thead>
                <tr className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] text-[var(--accent)] font-bold uppercase tracking-wider text-[10px] font-data-mono">
                  <th className="p-3.5">音频名称</th>
                  <th className="p-3.5">频道类别</th>
                  <th className="p-3.5">音效类别</th>
                  <th className="p-3.5">试听</th>
                  <th className="p-3.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {filteredAssets.map((item) => {
                  const isPlaying = playingId === item.id;
                  const categoryLabel = item.channelCategory || item.category;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[var(--bg-subcard)]/50 transition-colors ${
                        isPlaying ? 'bg-[var(--accent)]/5' : ''
                      }`}
                    >
                      {/* 名称 */}
                      <td className="p-3.5 font-bold text-[var(--text-primary)] max-w-md">
                        <div className="truncate">{item.title}</div>
                        {item.sourceText && (
                          <div className="text-[10px] text-[var(--text-muted)] truncate mt-1" title={item.sourceText}>
                            <span className="material-symbols-outlined text-[10px] inline-block align-middle mr-1 text-[var(--accent)]">record_voice_over</span>
                            {item.sourceText}
                          </div>
                        )}
                        {item.usedInChannels && item.usedInChannels.length > 0 && (
                          <div className="text-[10px] text-[var(--accent)] font-data-mono truncate mt-1 font-bold">
                            已绑定: {item.usedInChannels.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* 频道类别 */}
                      <td className="p-3.5">
                        <span
                          className={`inline-block font-data-mono text-[10px] uppercase border px-2 py-0.5 rounded-sm font-bold ${getCategoryColor(
                            categoryLabel
                          )}`}
                        >
                          {categoryLabel}
                        </span>
                      </td>

                      {/* 音效类别 */}
                      <td className="p-3.5 font-data-mono text-[11px] text-[var(--accent)] font-bold">
                        {item.audioType || '音效'}
                      </td>

                      {/* 试听 */}
                      <td className="p-3.5">
                        <button
                          onClick={() => togglePlay(item)}
                          className={`px-3 py-1 rounded-sm text-xs font-serif-editorial flex items-center gap-1 cursor-pointer transition-all border ${
                            isPlaying
                              ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] font-bold'
                              : 'bg-[var(--bg-subcard)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent)]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isPlaying ? 'pause' : 'play_arrow'}
                          </span>
                          <span>{isPlaying ? '播放中' : '试听'}</span>
                        </button>
                      </td>

                      {/* 分配、编辑与删除操作 */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAssign(item)}
                            className="p-1.5 text-[var(--accent)] hover:bg-[var(--accent)]/15 rounded-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="分配到频道"
                          >
                            <span className="material-symbols-outlined text-sm">link</span>
                            <span>分配</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="编辑"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            <span>编辑</span>
                          </button>

                          {onDeleteAsset && (
                            <button
                              onClick={() => {
                                if (confirm(`确定要删除音频资产 "${item.title}" 吗？`)) {
                                  onDeleteAsset(item.id);
                                }
                              }}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="删除"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              <span>删除</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      <AudioEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        asset={editingAsset}
        onSaveAsset={(savedAsset) => {
          if (editingAsset && onUpdateAsset) {
            onUpdateAsset(savedAsset);
          } else if (onAddAsset) {
            onAddAsset(savedAsset);
          }
        }}
        onDeleteAsset={onDeleteAsset}
      />

      {/* Assign Modal */}
      <AssignToChannelModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        asset={assigningAsset}
        dolls={dolls}
        onAssignAssetToChannel={(assetId, dollId, channelId, itemType) => {
          if (onAssignToChannel) {
            onAssignToChannel(assetId, dollId, channelId, itemType);
          }
        }}
      />
    </div>
  );
};
