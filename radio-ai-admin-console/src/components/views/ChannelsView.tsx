import React, { useState, useMemo, useRef } from 'react';
import { Doll, ChannelCategory, PlaylistItem, PlaylistItemType, ChannelTemplate, Channel } from '../../types';
import { ChannelTemplatesView } from './ChannelTemplatesView';
import { AiConfigView } from './AiConfigView';
import { playSynthPreset, stopCurrentSynth } from '../../utils/audioSynth';


interface ChannelsViewProps {
  dolls: Doll[];
  onToggleLive: (dollId: string, variantId: string) => void;
  onEditDoll: (doll: Doll) => void;
  onCreateDoll: () => void;
  onDeleteDoll?: (dollId: string) => void;
  onAddChannel?: (dollId: string) => void;
  onEditChannel?: (doll: Doll, variantId: string) => void;
  onDeleteChannel?: (dollId: string, variantId: string) => void;

  // Props for Templates
  templates: ChannelTemplate[];
  onAddTemplate: (template: ChannelTemplate) => void;
  onUpdateTemplate: (template: ChannelTemplate) => void;
  onDeleteTemplate: (id: string) => void;

  // Props for AI Config
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

const CATEGORY_OPTIONS: { id: string; label: string; icon: string }[] = [
  { id: 'ALL', label: '全部类别', icon: 'apps' },
  { id: '新闻频道', label: '新闻频道', icon: 'newspaper' },
  { id: '天气频道', label: '天气频道', icon: 'wb_sunny' },
  { id: '电子宠物频道', label: '电子宠物频道', icon: 'pets' },
  { id: '故事频道', label: '故事频道', icon: 'menu_book' },
  { id: '音乐频道', label: '音乐频道', icon: 'library_music' },
  { id: '剧场频道', label: '剧场频道', icon: 'theater_comedy' },
  { id: '学习频道', label: '学习频道', icon: 'school' },
];

function getItemTypeBadge(type: PlaylistItemType) {
  switch (type) {
    case 'intro':
      return { label: '开场音', color: 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20', icon: 'campaign' };
    case 'transition':
      return { label: '转场音', color: 'bg-purple-500/10 text-purple-800 dark:text-purple-400 border-purple-500/20', icon: 'graphic_eq' };
    case 'news_script':
      return { label: '新闻稿', color: 'bg-black/5 dark:bg-white/10 text-[var(--text-primary)] border-black/10 dark:border-white/20', icon: 'newspaper' };
    case 'commentary':
      return { label: '点评音', color: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/20', icon: 'chat_bubble' };
    case 'outro':
      return { label: '结束音', color: 'bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-500/20', icon: 'output' };
    case 'weather_report':
      return { label: '天气播报音', color: 'bg-sky-500/10 text-sky-800 dark:text-sky-400 border-sky-500/20', icon: 'wb_sunny' };
    case 'pet_event':
      return { label: '特定时间点内容', color: 'bg-pink-500/10 text-pink-800 dark:text-pink-400 border-pink-500/20', icon: 'pets' };
    case 'story_body':
      return { label: '故事主体', color: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-400 border-indigo-500/20', icon: 'menu_book' };
    case 'music_track':
      return { label: '曲目播放', color: 'bg-teal-500/10 text-teal-800 dark:text-teal-400 border-teal-500/20', icon: 'library_music' };
    case 'theater_act':
      return { label: '剧场幕数', color: 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-400 border-yellow-500/20', icon: 'theater_comedy' };
    case 'lesson_audio':
      return { label: '教材播放', color: 'bg-blue-500/10 text-blue-800 dark:text-blue-400 border-blue-500/20', icon: 'headphones' };
    case 'lesson_explanation':
      return { label: '知识讲解', color: 'bg-violet-500/10 text-violet-800 dark:text-violet-400 border-violet-500/20', icon: 'record_voice_over' };
    case 'learning_practice':
      return { label: '跟读练习', color: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/20', icon: 'mic' };
    case 'learning_quiz':
      return { label: '互动问答', color: 'bg-orange-500/10 text-orange-800 dark:text-orange-400 border-orange-500/20', icon: 'quiz' };
    default:
      return { label: '音轨节点', color: 'bg-gray-500/10 text-gray-800 dark:text-gray-400 border-gray-500/20', icon: 'audiotrack' };
  }
}

export const ChannelsView: React.FC<ChannelsViewProps> = ({
  dolls,
  onToggleLive,
  onEditDoll,
  onCreateDoll,
  onDeleteDoll,
  onAddChannel,
  onEditChannel,
  onDeleteChannel,
  templates,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  apiKey,
  onSaveApiKey,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'ai-config'>('overview');

  const [expandedDollIds, setExpandedDollIds] = useState<Record<string, boolean>>({});
  const [expandedPlaylistIds, setExpandedPlaylistIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  const [deletingDollId, setDeletingDollId] = useState<string | null>(null);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);

  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const trackAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayTrack = (item: PlaylistItem) => {
    if (playingTrackId === item.id) {
      if (trackAudioRef.current) {
        trackAudioRef.current.pause();
        trackAudioRef.current = null;
      }
      stopCurrentSynth();
      setPlayingTrackId(null);
      return;
    }

    if (trackAudioRef.current) {
      trackAudioRef.current.pause();
      trackAudioRef.current = null;
    }
    stopCurrentSynth();

    setPlayingTrackId(item.id);
    if (item.audioUrl) {
      const audio = new Audio(item.audioUrl);
      trackAudioRef.current = audio;
      audio.onended = () => {
        setPlayingTrackId(null);
        trackAudioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingTrackId(null);
        trackAudioRef.current = null;
      };
      audio.play().catch(() => {
        setPlayingTrackId(null);
        trackAudioRef.current = null;
      });
    } else {
      playSynthPreset('jingle', item.durationSeconds || 4);
      setTimeout(() => {
        setPlayingTrackId((cur) => (cur === item.id ? null : cur));
      }, Math.min((item.durationSeconds || 4) * 1000, 5000));
    }
  };

  const togglePlaylistExpand = (variantId: string) => {
    setExpandedPlaylistIds((prev) => ({
      ...prev,
      [variantId]: !prev[variantId],
    }));
  };


  // Compute statistics
  const totalAnchors = dolls.length;
  const getChannels = (d: Doll): Channel[] => d.channels || (d as any).variants || [];

  const allVariants = useMemo(() => {
    return dolls.flatMap((d) =>
      getChannels(d).map((v) => ({
        ...v,
        anchorName: d.name,
        anchorId: d.id,
        avatarUrl: d.avatarUrl,
        stationCode: d.stationCode,
      }))
    );
  }, [dolls]);

  const totalChannels = allVariants.length;
  const totalLiveChannels = allVariants.filter((v) => v.isLive).length;

  // Filter dolls based on search query, model ID filter, and category filter
  const filteredDolls = useMemo(() => {
    return dolls
      .map((doll) => {
        const channels = getChannels(doll);
        // Filter channels by model filter and category filter
        const matchingVariants = channels.filter((v) => {
          const matchModel = selectedModelId === 'ALL' || v.doll_id === selectedModelId;
          const matchCat =
            selectedCategory === 'ALL' ||
            v.category === selectedCategory ||
            (v.categories && v.categories.includes(selectedCategory));
          return matchModel && matchCat;
        });

        const matchAnchor = doll.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchVariants = channels.some(
          (v) =>
            (v.name && v.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (v.doll_id && v.doll_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (v.model_name && v.model_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (v.code && v.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (v.category && v.category.includes(searchQuery))
        );

        if ((matchAnchor || matchVariants) && matchingVariants.length > 0) {
          return {
            ...doll,
            displayVariants: matchingVariants,
          };
        }
        return null;
      })
      .filter(Boolean) as (Doll & { displayVariants: Channel[] })[];
  }, [dolls, searchQuery, selectedModelId, selectedCategory]);

  const toggleExpand = (dollId: string) => {
    setExpandedDollIds((prev) => ({
      ...prev,
      [dollId]: !(prev[dollId] ?? true),
    }));
  };

  const areAnyExpanded = useMemo(() => {
    if (filteredDolls.length === 0) return false;
    return filteredDolls.some((d) => (expandedDollIds[d.id] ?? true) === true);
  }, [filteredDolls, expandedDollIds]);

  const toggleAllExpand = () => {
    const nextState: Record<string, boolean> = {};
    dolls.forEach((d) => {
      nextState[d.id] = !areAnyExpanded;
    });
    setExpandedDollIds(nextState);
  };

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8 animate-fadeIn transition-colors duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <h2 className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)] tracking-wide flex items-center gap-2">
            <span>频道全览</span>
          </h2>
          <p className="text-xs font-sans text-[var(--text-muted)] mt-1">
            统一管理各频道播放节点、音频配乐及绑定的主播角色。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleAllExpand}
            className="bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] font-serif-editorial text-xs px-4 py-2.5 rounded-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">
              {areAnyExpanded ? 'unfold_less' : 'unfold_more'}
            </span>
            <span>{areAnyExpanded ? '全部折叠' : '全部展开'}</span>
          </button>

          <button
            onClick={onCreateDoll}
            className="bg-[var(--bg-subcard)] border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] font-serif-editorial font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>创建新主播</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-subcard)] rounded-t-sm overflow-hidden">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 text-sm font-bold font-serif-editorial transition-colors flex justify-center items-center gap-2 ${
            activeTab === 'overview' ? 'bg-[var(--bg-card)] text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className="material-symbols-outlined text-base">podcasts</span>
          频道全览
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-3 text-sm font-bold font-serif-editorial transition-colors flex justify-center items-center gap-2 ${
            activeTab === 'templates' ? 'bg-[var(--bg-card)] text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className="material-symbols-outlined text-base">view_list</span>
          内容模板
        </button>
        <button
          onClick={() => setActiveTab('ai-config')}
          className={`flex-1 py-3 text-sm font-bold font-serif-editorial transition-colors flex justify-center items-center gap-2 ${
            activeTab === 'ai-config' ? 'bg-[var(--bg-card)] text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className="material-symbols-outlined text-base">tune</span>
          全局AI配置
        </button>
      </div>

      {activeTab === 'templates' && (
        <ChannelTemplatesView
          templates={templates}
          onAddTemplate={onAddTemplate}
          onUpdateTemplate={onUpdateTemplate}
          onDeleteTemplate={onDeleteTemplate}
        />
      )}

      {activeTab === 'ai-config' && (
        <AiConfigView
          apiKey={apiKey}
          onSaveApiKey={onSaveApiKey}
        />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-data-mono text-[var(--text-muted)] block uppercase">
              主播角色总数
            </span>
            <span className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)]">
              {totalAnchors} 位
            </span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[var(--bg-subcard)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)]">
            <span className="material-symbols-outlined">person_pin</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--accent)]/30 p-4 rounded-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-data-mono text-[var(--accent)] block uppercase font-bold">
              频道总数
            </span>
            <span className="text-2xl font-serif-editorial font-bold text-[var(--accent)]">
              {totalChannels} 个
            </span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
            <span className="material-symbols-outlined">dataset</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-data-mono text-[var(--text-muted)] block uppercase">
              直播中频道
            </span>
            <span className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>{totalLiveChannels} 个</span>
              {totalLiveChannels > 0 && (
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
              )}
            </span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[var(--bg-subcard)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)]">
            <span className="material-symbols-outlined">sensors</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-sm flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-[var(--text-muted)]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模型 ID / 角色名 / 频道..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm pl-9 pr-3 py-2 text-xs font-serif-editorial text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-data-mono text-[var(--text-muted)] whitespace-nowrap">
              模型筛选:
            </span>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm px-3 py-1.5 text-xs font-data-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="ALL">全部模型 ID ({allVariants.length}个)</option>
              {Array.from(new Set(allVariants.map((v) => v.doll_id))).map((id) => {
                const item = allVariants.find((v) => v.doll_id === id);
                return (
                  <option key={id} value={id}>
                    {id} ({item?.anchorName})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[var(--border-color)] scrollbar-none">
          <span className="text-xs font-data-mono text-[var(--accent)] font-bold whitespace-nowrap shrink-0 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">category</span>
            频道类别:
          </span>
          {CATEGORY_OPTIONS.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-sm text-xs font-serif-editorial transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold shadow-sm'
                    : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Doll Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filteredDolls.map((doll) => {
          const channels = doll.displayVariants || getChannels(doll);
          const isExpanded = expandedDollIds[doll.id] ?? true;
          const hasLiveVariant = channels.some((v) => v.isLive);
          const liveVariantCount = channels.filter((v) => v.isLive).length;

          // Determine status info & icon
          let statusText = '离线';
          let statusIcon = 'wifi_off';
          let statusStyle = 'bg-white/5 text-[var(--text-muted)] border-[var(--border-color)]';
          let dotStyle = 'bg-gray-500';

          if (doll.status === 'online') {
            if (hasLiveVariant) {
              statusText = '直播中';
              statusIcon = 'sensors';
              statusStyle = 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30';
              dotStyle = 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse';
            } else {
              statusText = '在线待命';
              statusIcon = 'wifi';
              statusStyle = 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30';
              dotStyle = 'bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]';
            }
          }

          return (
            <div
              key={doll.id}
              className={`bg-[var(--bg-card)] rounded-sm border border-[var(--border-color)] overflow-hidden flex flex-col transition-all duration-300 ${
                doll.status === 'offline' ? 'opacity-80 hover:opacity-100' : 'shadow-lg'
              }`}
            >
              {/* Doll Header (Clickable to Expand/Collapse) */}
              <div
                onClick={() => toggleExpand(doll.id)}
                className="bg-[var(--bg-subcard)] p-5 border-b border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-card)] transition-colors select-none"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-sm overflow-hidden border border-[var(--accent)]/40 relative shrink-0">
                    <img src={doll.avatarUrl} alt={doll.name} className="w-full h-full object-cover" />
                    <div
                      className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-[var(--bg-subcard)] ${dotStyle}`}
                    ></div>
                  </div>

                  <div>
                    <h3 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span className="text-[var(--accent)] font-bold">{doll.name}</span>
                      <span className="bg-[var(--accent)]/15 text-[var(--accent)] font-data-mono text-[10px] px-2 py-0.5 rounded-sm border border-[var(--accent)]/30 uppercase tracking-widest">
                        {doll.stationCode}
                      </span>
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 font-sans flex items-center gap-2 flex-wrap">
                      <span>{doll.tagline}</span>
                      <span className="text-[var(--border-color)]">•</span>
                      <span className="font-data-mono text-[11px] text-[var(--accent)] font-semibold">
                        关联频道: {channels.length} 个 {liveVariantCount > 0 && `(${liveVariantCount} 直播中)`}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Indicator Icon & Badge */}
                  <span
                    className={`text-xs font-data-mono px-2 py-1 rounded-sm border flex items-center gap-1 ${statusStyle}`}
                  >
                    <span className="material-symbols-outlined text-sm">{statusIcon}</span>
                    <span>{statusText}</span>
                  </span>

                  {/* Settings Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditDoll(doll);
                    }}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-primary)] rounded-sm transition-colors cursor-pointer"
                    title="编辑玩偶角色"
                  >
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                  </button>

                  {/* Delete Doll Button */}
                  {onDeleteDoll && (
                    deletingDollId === doll.id ? (
                      <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 p-1 rounded-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDoll(doll.id);
                            setDeletingDollId(null);
                          }}
                          className="px-2 py-0.5 bg-red-600 text-white rounded-sm text-[10px] font-bold cursor-pointer"
                        >
                          确认删玩偶
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingDollId(null);
                          }}
                          className="px-1.5 py-0.5 bg-gray-600 text-white rounded-sm text-[10px] cursor-pointer"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingDollId(doll.id);
                        }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-colors cursor-pointer"
                        title="删除整个玩偶"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )
                  )}

                  {/* Expand/Collapse Chevron Indicator */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(doll.id);
                    }}
                    className="p-1.5 text-[var(--accent)] hover:bg-[var(--bg-primary)] rounded-sm transition-colors cursor-pointer flex items-center gap-1 text-xs font-data-mono"
                    title={isExpanded ? '折叠频道列表' : '展开频道列表'}
                  >
                    <span className="hidden sm:inline">{isExpanded ? '收起' : '展开'}</span>
                    <span className="material-symbols-outlined text-[18px] transition-transform duration-200">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Collapsed / Expanded Content Area */}
              {isExpanded ? (
                <div className="p-6 flex flex-col gap-5 bg-[var(--bg-card)] flex-1 animate-fadeIn">
                  <h4 className="font-data-mono text-[11px] text-[var(--accent)] uppercase tracking-[0.15em] flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                    <span>所属模型频道列表 - 共 {(doll.displayVariants || getChannels(doll)).length} 个频道</span>
                    <button
                      type="button"
                      onClick={() => onAddChannel ? onAddChannel(doll.id) : onEditDoll(doll)}
                      className="px-2.5 py-1 bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] rounded-sm text-[11px] font-data-mono font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>+ 新增频道</span>
                    </button>
                  </h4>

                  {(doll.displayVariants || getChannels(doll)).length > 0 ? (
                    (doll.displayVariants || getChannels(doll)).map((variant) => {
                      const isPlaylistExpanded = expandedPlaylistIds[variant.id] ?? false;
                      const playlistItems = variant.playlist || [];

                      return (
                        <div
                          key={variant.id}
                          className="bg-[var(--bg-primary)] p-4 rounded-sm border border-[var(--border-color)] relative hover:border-[var(--accent)]/40 transition-all space-y-3"
                        >
                          {/* Header Line with doll_id and channel_id Badges */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-[var(--accent)] text-[var(--accent-text)] font-data-mono text-xs font-bold px-2 py-0.5 rounded-sm tracking-wider flex items-center gap-1 shadow-sm">
                                  <span className="material-symbols-outlined text-xs">smart_toy</span>
                                  {variant.doll_id}
                                </span>
                                <span className="bg-[var(--bg-subcard)] text-[var(--text-primary)] font-data-mono text-xs font-bold px-2 py-0.5 rounded-sm border border-[var(--border-color)]">
                                  {variant.channel_id || variant.code}
                                </span>
                                {variant.category && (
                                  <span className="bg-[var(--accent)]/20 text-[var(--accent)] font-serif-editorial text-xs font-bold px-2 py-0.5 rounded-sm border border-[var(--accent)]/30">
                                    {variant.category}
                                  </span>
                                )}
                                <h5 className="text-sm font-serif-editorial font-bold text-[var(--text-primary)]">
                                  {variant.channel_name || variant.name}
                                </h5>
                                {variant.isLive && (
                                  <span className="flex items-center gap-1 text-[var(--accent)] text-[10px] font-bold bg-[var(--accent)]/15 px-2 py-0.5 rounded-sm border border-[var(--accent)]/30 tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse"></span>
                                    直播中
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Toggle Switch & Quick Delete */}
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] font-data-mono text-[var(--text-muted)]">
                                {variant.isLive ? '开播中' : '未开播'}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={variant.isLive}
                                  onChange={() => onToggleLive(doll.id, variant.id)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-muted)] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)] peer-checked:after:bg-[var(--accent-text)]"></div>
                              </label>

                              {onDeleteChannel && (
                                deletingVariantId === variant.id ? (
                                  <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 p-1 rounded-sm">
                                    <button
                                      onClick={() => {
                                        onDeleteChannel(doll.id, variant.id);
                                        setDeletingVariantId(null);
                                      }}
                                      className="px-2 py-0.5 bg-red-600 text-white rounded-sm text-[10px] font-bold cursor-pointer"
                                    >
                                      确认删除
                                    </button>
                                    <button
                                      onClick={() => setDeletingVariantId(null)}
                                      className="px-1.5 py-0.5 bg-gray-600 text-white rounded-sm text-[10px] cursor-pointer"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingVariantId(variant.id)}
                                    className="p-1 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-colors cursor-pointer"
                                    title="删除此频道"
                                  >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <span className="block font-data-mono text-[10px] text-[var(--text-muted)] mb-1 uppercase">
                                分类属性 / 频道类别
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {variant.category && (
                                  <span className="bg-[var(--accent)]/15 px-2 py-0.5 rounded-sm text-[11px] text-[var(--accent)] font-serif-editorial border border-[var(--accent)]/30 font-bold">
                                    {variant.category}
                                  </span>
                                )}
                                {variant.categories.map((cat, i) => (
                                  <span
                                    key={i}
                                    className="bg-[var(--bg-subcard)] px-2 py-0.5 rounded-sm text-[11px] text-[var(--text-primary)] font-serif-editorial border border-[var(--border-color)]"
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="block font-data-mono text-[10px] text-[var(--text-muted)] mb-1 uppercase">
                                模型人设提示词 (Prompt)
                              </span>
                              <p className="text-[11px] text-[var(--text-primary)] font-sans bg-[var(--bg-subcard)] p-1.5 rounded-sm border border-[var(--border-color)] truncate" title={variant.prompt}>
                                {variant.prompt}
                              </p>
                            </div>
                          </div>

                          {/* Playlist Nodes Drawer */}
                          <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2.5 space-y-2">
                            <div
                              onClick={() => togglePlaylistExpand(variant.id)}
                              className="flex items-center justify-between cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-[var(--accent)]">queue_music</span>
                                <span className="font-data-mono text-xs font-bold text-[var(--text-primary)]">
                                  频道播放列表
                                </span>
                                <span className="text-[10px] font-data-mono px-1.5 py-0.2 bg-[var(--bg-primary)] text-[var(--accent)] border border-[var(--border-color)] rounded-sm">
                                  {playlistItems.length} 个音轨节点
                                </span>
                              </div>
                              <button className="text-xs text-[var(--accent)] font-serif-editorial flex items-center gap-0.5 hover:underline">
                                <span>{isPlaylistExpanded ? '收起列表' : '查看节点构成'}</span>
                                <span className="material-symbols-outlined text-sm">
                                  {isPlaylistExpanded ? 'expand_less' : 'expand_more'}
                                </span>
                              </button>
                            </div>

                            {/* Playlist Flow preview bar (collapsed view) */}
                            {!isPlaylistExpanded && playlistItems.length > 0 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
                                {playlistItems.map((item, idx) => {
                                  const badge = getItemTypeBadge(item.type);
                                  return (
                                    <React.Fragment key={item.id}>
                                      <div className={`px-2 py-1 rounded-sm border text-[10px] font-data-mono flex items-center gap-1 shrink-0 ${badge.color}`}>
                                        <span className="material-symbols-outlined text-xs">{badge.icon}</span>
                                        <span>{item.timeSlot ? `[${item.timeSlot}] ` : ''}{badge.label}</span>
                                      </div>
                                      {idx < playlistItems.length - 1 && (
                                        <span className="text-[10px] text-[var(--text-muted)] font-data-mono shrink-0">→</span>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            )}

                            {/* Expanded Detailed Playlist View */}
                            {isPlaylistExpanded && (
                              <div className="pt-2 border-t border-[var(--border-color)] space-y-2 animate-fadeIn">
                                {playlistItems.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {playlistItems.map((item, idx) => {
                                      const badge = getItemTypeBadge(item.type);
                                      return (
                                        <div
                                          key={item.id}
                                          className="bg-[var(--bg-primary)] p-2 rounded-sm border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                        >
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="font-data-mono text-[10px] text-[var(--text-muted)] w-4 text-center shrink-0">
                                              {idx + 1}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-sm border text-[10px] font-data-mono font-bold flex items-center gap-1 shrink-0 ${badge.color}`}>
                                              <span className="material-symbols-outlined text-xs">{badge.icon}</span>
                                              {badge.label}
                                            </span>
                                            {item.timeSlot && (
                                              <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 font-data-mono font-bold text-[10px] rounded-sm shrink-0">
                                                ⏰ {item.timeSlot}
                                              </span>
                                            )}
                                            <span className="font-serif-editorial font-bold text-[var(--text-primary)] truncate" title={item.title}>
                                              {item.title}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3 shrink-0 font-data-mono text-[10px] text-[var(--text-muted)] pl-6 sm:pl-0">
                                            <span>发声: <strong className="text-[var(--text-primary)]">{item.speakerRole}</strong></span>
                                            <span>时长: {item.durationFormatted}</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handlePlayTrack(item);
                                              }}
                                              className={`px-2 py-0.5 rounded-sm text-[10px] font-serif-editorial flex items-center gap-1 transition-all cursor-pointer border ${
                                                playingTrackId === item.id
                                                  ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] font-bold shadow-xs'
                                                  : 'bg-[var(--bg-subcard)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent)]'
                                              }`}
                                              title={playingTrackId === item.id ? '暂停' : '试听此音轨'}
                                            >
                                              <span className="material-symbols-outlined text-xs">
                                                {playingTrackId === item.id ? 'pause' : 'play_arrow'}
                                              </span>
                                              <span>{playingTrackId === item.id ? '播放中' : '试听'}</span>
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}

                                  </div>
                                ) : (
                                  <p className="text-xs text-[var(--text-muted)] font-sans py-2 text-center">
                                    暂未配置音轨节点列表
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Audio Waveform Animation when Live */}
                          {variant.isLive && (
                            <div className="h-6 w-full bg-[var(--bg-subcard)] rounded-sm flex items-end justify-center gap-1 px-2 overflow-hidden border border-[var(--border-color)]">
                              <div className="w-0.5 bg-[var(--accent)] h-[30%] bar-1"></div>
                              <div className="w-0.5 bg-[var(--accent)] h-[60%] bar-2"></div>
                              <div className="w-0.5 bg-[var(--accent)] h-[90%] bar-3"></div>
                              <div className="w-0.5 bg-[var(--accent)] h-[40%] bar-4"></div>
                              <div className="w-0.5 bg-[var(--accent)] h-[80%] bar-5"></div>
                              <div className="w-0.5 bg-[var(--accent)] h-[50%] bar-2"></div>
                              <div className="w-0.5 bg-[var(--accent)] h-[20%] bar-1"></div>
                            </div>
                          )}

                          <div className="flex gap-2 border-t border-[var(--border-color)] pt-3">
                            <button
                              onClick={() => onEditChannel ? onEditChannel(doll, variant.id) : onEditDoll(doll)}
                              className="flex-1 bg-[var(--bg-subcard)] hover:opacity-90 transition-colors py-1.5 rounded-sm text-xs font-serif-editorial text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm text-[var(--accent)]">tune</span>
                              <span>编辑频道配置</span>
                            </button>
                            <button
                              onClick={() => onEditChannel ? onEditChannel(doll, variant.id) : onEditDoll(doll)}
                              className="flex-1 bg-[var(--bg-subcard)] hover:opacity-90 transition-colors py-1.5 rounded-sm text-xs font-serif-editorial text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm text-[var(--accent)]">mic_external_on</span>
                              <span>开/结束语台词</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-[var(--text-muted)] font-data-mono text-xs bg-[var(--bg-primary)] rounded-sm border border-[var(--border-color)] flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-[var(--text-muted)]/50">sensors_off</span>
                      <span>暂无匹配的模型频道</span>
                      <button
                        onClick={() => onAddChannel ? onAddChannel(doll.id) : onEditDoll(doll)}
                        className="mt-2 px-4 py-1.5 bg-[var(--bg-subcard)] hover:opacity-90 text-[var(--accent)] border border-[var(--accent)]/30 rounded-sm text-xs font-serif-editorial transition-all cursor-pointer"
                      >
                        新增模型频道
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {/* End of Active Channels List */}
    </div>
  )}
    </div>
  );
};
