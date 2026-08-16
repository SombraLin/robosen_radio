import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/views/DashboardView';
import { NewsConsoleView } from './components/views/NewsConsoleView';
import { ChannelsView } from './components/views/ChannelsView';
import { AutomationView } from './components/views/AutomationView';
import { AudioAssetsView } from './components/views/AudioAssetsView';
import { DeviceSimulatorView } from './components/views/DeviceSimulatorView';
import { DollAtlasStudioView } from './components/views/DollAtlasStudioView';
import { ChannelStudioView } from './components/views/ChannelStudioView';
import { TrashView } from './components/views/TrashView';
import { LogsView } from './components/views/LogsView';

import { NewBroadcastModal } from './components/modals/NewBroadcastModal';
import { ChainPreviewModal } from './components/modals/ChainPreviewModal';
import { DollEditorModal } from './components/modals/DollEditorModal';
import { NewsDetailModal } from './components/modals/NewsDetailModal';
import { ApiKeySettingsModal } from './components/modals/ApiKeySettingsModal';

import { ViewTab, NewsClip, BroadcastChainItem, Doll, Channel, ExecutionLog, PipelineConfig, AudioAssetItem, PlaylistItem } from './types';
import { ThemeId, applyTheme } from './theme';
import { getAdminNews, isRadioAiApiEnabled, getDollsApi, saveDollApi, deleteDollApi, saveChannelApi, deleteChannelApi, getAudioAssetsApi, saveAudioAssetApi, deleteAudioAssetApi } from './api/newsCenter';
import {
  INITIAL_NEWS_CLIPS,
  INITIAL_CHAIN_ITEMS,
  INITIAL_DOLLS,
  INITIAL_LOGS,
  INITIAL_PIPELINE_CONFIG,
  INITIAL_AUDIO_ASSETS,
  CHANNEL_TEMPLATES,
} from './data/mockData';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('channels'); // Defaulting to channels view
  const [searchQuery, setSearchQuery] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('dashscope_api_key') || '');

  // Theme state
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('editorial_theme') as ThemeId;
      return saved || 'apple-blue';
    } catch {
      return 'apple-blue';
    }
  });

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Data state
  const [newsClips, setNewsClips] = useState<NewsClip[]>(INITIAL_NEWS_CLIPS);
  const [chainItems, setChainItems] = useState<BroadcastChainItem[]>(INITIAL_CHAIN_ITEMS);
  const [dolls, setDolls] = useState<Doll[]>(INITIAL_DOLLS);
  const [logs, setLogs] = useState<ExecutionLog[]>(INITIAL_LOGS);
  const [audioAssets, setAudioAssets] = useState<AudioAssetItem[]>(() => {
    try {
      const saved = localStorage.getItem('radio_ai_audio_assets');
      return saved ? JSON.parse(saved) : INITIAL_AUDIO_ASSETS;
    } catch {
      return INITIAL_AUDIO_ASSETS;
    }
  });
  const [templates, setTemplates] = useState(CHANNEL_TEMPLATES);

  useEffect(() => {
    try {
      localStorage.setItem('radio_ai_audio_assets', JSON.stringify(audioAssets));
    } catch (e) {
      console.error('保存音频资产到 localStorage 失败:', e);
    }
  }, [audioAssets]);

  const loadNewsFromApi = () => {
    if (!isRadioAiApiEnabled()) return;
    getAdminNews({ pageSize: 100 })
      .then((page) => {
        const categoryMap: Record<string, NewsClip['category']> = {
          tech: '科技',
          internet: '科技',
          finance: '市场',
          entertainment: '娱乐',
          hot: '文化',
          china: '政治',
          world: '政治',
          military: '政治',
          sports: '文化',
          auto: '科技',
        };
        const statusMap: Record<string, NewsClip['status']> = {
          ready: '已就绪',
          draft: '草稿',
          generating: '生成中',
          stale: '处理中',
          failed: '处理中',
          interrupted: '处理中',
        };
        setNewsClips(page.items.map((item) => ({
          id: item.id,
          category: categoryMap[item.tag] || '文化',
          title: item.title,
          content: `${item.source} · ${item.tag} · 点评 ${item.commentary_ready_count}/${item.commentary_count}`,
          durationSeconds: 45,
          durationFormatted: '0:45',
          role: item.source,
          status: statusMap[item.script_status] || '草稿',
          createdAt: new Date(item.updated_at).toLocaleString('zh-CN', { hour12: false }),
        })));
      })
      .catch((error) => {
        console.error('加载 RADIO AI 新闻失败，保留当前页面数据：', error);
      });
  };

  const loadDollsFromApi = () => {
    if (!isRadioAiApiEnabled()) return;
    getDollsApi()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDolls(data);
        }
      })
      .catch((error) => {
        console.error('加载玩偶与频道配置失败，使用本地预设：', error);
      });
  };
  const loadAudioAssetsFromApi = () => {
    if (!isRadioAiApiEnabled()) return;
    getAudioAssetsApi()
      .then((loadedAssets) => {
        if (Array.isArray(loadedAssets) && loadedAssets.length > 0) {
          setAudioAssets(loadedAssets);
        }
      })
      .catch((error) => {
        console.error('加载持久化音频资产失败：', error);
      });
  };

  useEffect(() => {
    loadNewsFromApi();
    loadDollsFromApi();
    loadAudioAssetsFromApi();
  }, []);

  // Modals state
  const [isNewBroadcastOpen, setIsNewBroadcastOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [isApiKeySettingsOpen, setIsApiKeySettingsOpen] = useState(false);

  // Doll Modal state (editing pure Doll entity)
  const [isDollEditorOpen, setIsDollEditorOpen] = useState(false);
  const [editingDoll, setEditingDoll] = useState<Doll | null>(null);

  // Channel Studio state (editing/creating channels under a Doll)
  const [targetDollForChannel, setTargetDollForChannel] = useState<Doll | null>(null);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);

  // Handlers for Broadcast Chain
  const handleAddToChain = (clip: NewsClip) => {
    const newItem: BroadcastChainItem = {
      id: `chain-${Date.now()}`,
      type: 'news',
      title: clip.title,
      subtitle: `${clip.category}新闻 - ${clip.durationFormatted} | 角色: ${clip.role}`,
      durationSeconds: clip.durationSeconds,
      durationFormatted: clip.durationFormatted,
      clipId: clip.id,
    };
    setChainItems((prev) => [...prev, newItem]);
  };

  const handleRemoveFromChain = (id: string) => {
    setChainItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReorderChain = (startIndex: number, endIndex: number) => {
    if (startIndex < 0 || endIndex < 0 || startIndex >= chainItems.length || endIndex >= chainItems.length) return;
    setChainItems((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  // Handlers for Dolls
  const handleToggleLive = (dollId: string, channelId: string) => {
    setDolls((prev) =>
      prev.map((d) => {
        if (d.id === dollId || d.doll_id === dollId) {
          const updatedChannels = d.channels.map((channel) => {
            if (channel.id === channelId || channel.channel_id === channelId) {
              const updated = { ...channel, isLive: !channel.isLive };
              const targetDollKey = d.doll_id || d.id;
              saveChannelApi(targetDollKey, updated).catch((err) => console.error('保存直播状态失败:', err));
              return updated;
            }
            return channel;
          });
          const hasLive = updatedChannels.some((channel) => channel.isLive);
          const updatedDoll = {
            ...d,
            status: hasLive ? ('online' as const) : ('offline' as const),
            channels: updatedChannels,
          };
          saveDollApi(updatedDoll).catch((err) => console.error('保存玩偶在线状态失败:', err));
          return updatedDoll;
        }
        return d;
      })
    );
  };

  const handleDeleteDoll = (dollId: string) => {
    const targetDoll = dolls.find((d) => d.id === dollId || d.doll_id === dollId);
    const targetKey = targetDoll?.doll_id || dollId;
    setDolls((prev) => prev.filter((d) => d.id !== dollId && d.doll_id !== dollId));
    deleteDollApi(targetKey).catch((err) => console.error('删除玩偶失败:', err));
  };

  const handleOpenEditDoll = (doll: Doll) => {
    setEditingDoll(doll);
    setIsDollEditorOpen(true);
  };

  const handleCreateDoll = () => {
    const newDollId = `doll-${Date.now()}`;
    const newDoll: Doll = {
      id: newDollId,
      name: '新玩偶主播',
      stationCode: `STATION_${Math.floor(10 + Math.random() * 90)}`,
      tagline: 'AI 电台专栏主播',
      roleTitle: 'Virtual Host',
      status: 'offline',
      avatarUrl: '/avatars/ROBOSEN-BASIC-LIGHT.png',
      currentBroadcastProgress: 0,
      streamInfo: 'Stream: 1080p | Latency: --',
      channels: [], // 新建玩偶不默认创建频道，频道由用户在玩偶卡片中自由添加
    };
    setEditingDoll(newDoll);
    setIsDollEditorOpen(true);
  };

  const handleSaveDoll = (updatedDoll: Doll) => {
    setDolls((prev) => {
      const exists = prev.some((d) => d.id === updatedDoll.id || (d.doll_id && d.doll_id === updatedDoll.doll_id));
      if (exists) {
        return prev.map((d) => (d.id === updatedDoll.id || (d.doll_id && d.doll_id === updatedDoll.doll_id) ? updatedDoll : d));
      }
      return [...prev, updatedDoll];
    });
    saveDollApi(updatedDoll).catch((err) => console.error('持久化保存玩偶配置到 SQLite 失败:', err));
  };

  // Handlers for Channels under a Doll
  const handleOpenAddChannel = (dollId: string) => {
    const targetDoll = dolls.find((d) => d.id === dollId || d.doll_id === dollId);
    if (!targetDoll) return;
    setTargetDollForChannel(targetDoll);
    setEditingChannelId(null);
    setCurrentTab('channel-studio');
  };

  const handleOpenEditChannel = (doll: Doll, channelId: string) => {
    setTargetDollForChannel(doll);
    setEditingChannelId(channelId);
    setCurrentTab('channel-studio');
  };

  const handleSaveChannel = (dollId: string, updatedChannel: Channel) => {
    const targetDoll = dolls.find((d) => d.id === dollId || d.doll_id === dollId);
    const targetDollKey = targetDoll?.doll_id || targetDoll?.id || dollId;

    setDolls((prev) =>
      prev.map((d) => {
        if (d.id === dollId || d.doll_id === dollId) {
          const exists = d.channels.some((channel) => channel.id === updatedChannel.id || channel.channel_id === updatedChannel.channel_id);
          let updatedChannels: Channel[];
          if (exists) {
            updatedChannels = d.channels.map((channel) => (channel.id === updatedChannel.id || channel.channel_id === updatedChannel.channel_id ? updatedChannel : channel));
          } else {
            updatedChannels = [...d.channels, updatedChannel];
          }
          return {
            ...d,
            status: updatedChannels.some((channel) => channel.isLive) ? 'online' : 'offline',
            channels: updatedChannels,
          };
        }
        return d;
      })
    );
    saveChannelApi(targetDollKey, updatedChannel).catch((err) => console.error('持久化保存频道及播放列表到 SQLite 失败:', err));
  };

  const handleDeleteChannel = (dollId: string, channelId: string) => {
    const targetDoll = dolls.find((d) => d.id === dollId || d.doll_id === dollId);
    const targetDollKey = targetDoll?.doll_id || targetDoll?.id || dollId;

    setDolls((prev) =>
      prev.map((d) => {
        if (d.id === dollId || d.doll_id === dollId) {
          const updatedChannels = d.channels.filter((channel) => channel.id !== channelId && channel.channel_id !== channelId);
          return {
            ...d,
            status: updatedChannels.some((channel) => channel.isLive) ? 'online' : 'offline',
            channels: updatedChannels,
          };
        }
        return d;
      })
    );
    deleteChannelApi(targetDollKey, channelId).catch((err) => console.error('删除频道失败:', err));
  };

  // Handlers for Automation
  const handleTriggerNow = (pipelineName: string) => {
    const newLog: ExecutionLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      category: pipelineName,
      duration: '2.4s',
      status: '成功',
      details: `通过手动触发执行【${pipelineName}】，成功生成并更新队列。`,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  // Handlers for Audio Assets
  const handleAddAudioAsset = (asset: AudioAssetItem) => {
    setAudioAssets((prev) => [asset, ...prev]);
    saveAudioAssetApi(asset).catch((err) => console.error('保存音频资产到 SQLite 数据库失败:', err));
  };

  const handleUpdateAudioAsset = (updated: AudioAssetItem) => {
    setAudioAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    saveAudioAssetApi(updated).catch((err) => console.error('更新音频资产到 SQLite 数据库失败:', err));
  };

  const handleDeleteAudioAsset = async (id: string) => {
    const asset = audioAssets.find((a) => a.id === id);
    setAudioAssets((prev) => prev.filter((a) => a.id !== id));
    if (asset) {
      deleteAudioAssetApi(asset.url || asset.id).catch((err) => console.error('从 SQLite 删除音频资产记录失败:', err));
    }
  };

  const handleAssignAssetToChannel = (
    assetId: string,
    dollId: string,
    channelId: string,
    itemType: 'intro' | 'transition' | 'outro' | 'music_track'
  ) => {
    const asset = audioAssets.find((a) => a.id === assetId);
    if (!asset) return;

    setDolls((prevDolls) =>
      prevDolls.map((doll) => {
        if (doll.id === dollId) {
          return {
            ...doll,
            channels: doll.channels.map((channel) => {
              if (channel.id === channelId) {
                const newPlaylistItem: PlaylistItem = {
                  id: `item-asset-${Date.now()}`,
                  type: itemType,
                  title: asset.title,
                  speakerRole: asset.speakerOrSource || '非TTS音频伴奏',
                  durationSeconds: asset.durationSeconds || 10,
                  durationFormatted: asset.duration,
                  contentSnippet: `[非TTS音频] ${asset.title} (#${asset.tags.join(' #')})`,
                  audioUrl: asset.url,
                };
                return {
                  ...channel,
                  playlist: [newPlaylistItem, ...(channel.playlist || [])],
                };
              }
              return channel;
            }),
          };
        }
        return doll;
      })
    );

    // Update usedInChannels in audioAssets
    const targetDoll = dolls.find((d) => d.id === dollId);
    const targetChannel = targetDoll?.channels.find((channel) => channel.id === channelId);
    const channelName = targetChannel ? targetChannel.channel_name || targetChannel.name : '指定频道';

    if (targetChannel) {
      const updatedChannel = {
        ...targetChannel,
        playlist: [
          {
            id: `item-asset-${Date.now()}`,
            type: itemType,
            title: asset.title,
            speakerRole: asset.speakerOrSource || '非TTS音频伴奏',
            durationSeconds: asset.durationSeconds || 10,
            durationFormatted: asset.duration,
            contentSnippet: `[非TTS音频] ${asset.title} (#${asset.tags.join(' #')})`,
            audioUrl: asset.url,
          },
          ...(targetChannel.playlist || []),
        ],
      };
      saveChannelApi(dollId, updatedChannel).catch((err) => console.error('保存音频资产分配至频道失败:', err));
    }


    setAudioAssets((prev) =>
      prev.map((a) => {
        if (a.id === assetId) {
          const existingChannels = a.usedInChannels || [];
          if (!existingChannels.includes(channelName)) {
            return {
              ...a,
              usedInChannels: [...existingChannels, channelName],
            };
          }
        }
        return a;
      })
    );
  };

  // Title translation helper
  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return '导播控制台';
      case 'channels':
        return '频道全览';
      case 'channel-studio':
        return '频道排播工作室';
      case 'news':
        return '导播控制台';
      case 'automation':
        return '工作室控制台';
      case 'audio':
        return '音频资产库';
      case 'device':
        return '设备端模拟器';
      case 'atlas':
        return '图鉴抠图 Studio';
      case 'ai-config':
        return 'AI 配置中心';
      case 'trash':
        return '回收站';
      case 'logs':
        return '实时日志中心';
      default:
        return '导播控制台';
    }
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen font-sans flex antialiased selection:bg-[var(--accent)] selection:text-[var(--bg-primary)] transition-colors duration-300">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewBroadcast={() => setIsNewBroadcastOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 pl-0 md:pl-[280px]">
        {/* Header Bar */}
        <Header
          pageTitle={getPageTitle()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenAtlasStudio={() => setCurrentTab('atlas')}
          onOpenApiKeySettings={() => setCurrentTab('ai-config')}
        />

        {/* Content Views */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              newsClips={newsClips}
              dolls={dolls}
              onNavigateToNews={() => setCurrentTab('channels')}
              onNavigateToChannels={() => setCurrentTab('channels')}
              onPlayClip={handleAddToChain}
              onToggleLive={handleToggleLive}
            />
          )}

          {currentTab === 'news' && (
            <NewsConsoleView
              newsClips={newsClips}
              chainItems={chainItems}
              onAddToChain={handleAddToChain}
              onRemoveFromChain={handleRemoveFromChain}
              onReorderChain={handleReorderChain}
              onOpenPreviewModal={() => setIsPreviewModalOpen(true)}
              onOpenNewBroadcast={() => setIsNewBroadcastOpen(true)}
              searchQuery={searchQuery}
              onOpenNews={isRadioAiApiEnabled() ? setSelectedNewsId : undefined}
            />
          )}

          {currentTab === 'channels' && (
            <ChannelsView
              dolls={dolls}
              onToggleLive={handleToggleLive}
              onEditDoll={handleOpenEditDoll}
              onCreateDoll={handleCreateDoll}
              onDeleteDoll={handleDeleteDoll}
              onAddChannel={handleOpenAddChannel}
              onEditChannel={handleOpenEditChannel}
              onDeleteChannel={handleDeleteChannel}
              templates={templates}
              onAddTemplate={(t) => setTemplates(prev => [...prev, t])}
              onUpdateTemplate={(t) => setTemplates(prev => prev.map(pt => pt.id === t.id ? t : pt))}
              onDeleteTemplate={(id) => setTemplates(prev => prev.filter(pt => pt.id !== id))}
              apiKey={apiKey}
              onSaveApiKey={setApiKey}
            />
          )}

          {currentTab === 'channel-studio' && targetDollForChannel && (
            <ChannelStudioView
              doll={targetDollForChannel}
              channelId={editingChannelId}
              onBack={() => setCurrentTab('channels')}
              onSaveChannel={handleSaveChannel}
              onDeleteChannel={handleDeleteChannel}
              audioAssets={audioAssets}
            />
          )}

          {currentTab === 'automation' && (
            <AutomationView />
          )}

          {currentTab === 'audio' && (
            <AudioAssetsView
              assets={audioAssets}
              dolls={dolls}
              onAddAsset={handleAddAudioAsset}
              onUpdateAsset={handleUpdateAudioAsset}
              onDeleteAsset={handleDeleteAudioAsset}
              onAssignToChannel={handleAssignAssetToChannel}
            />
          )}

          {currentTab === 'device' && <DeviceSimulatorView />}

          {currentTab === 'atlas' && (
            <DollAtlasStudioView
              onAvatarSaved={(dollId, newAvatarUrl) => {
                setDolls((prev) =>
                  prev.map((d) => (d.id === dollId ? { ...d, avatarUrl: newAvatarUrl } : d))
                );
              }}
            />
          )}

          {currentTab === 'trash' && <TrashView />}

          {currentTab === 'logs' && <LogsView initialLogs={logs} />}
        </main>
      </div>

      {/* Modals */}
      <NewBroadcastModal
        isOpen={isNewBroadcastOpen}
        onClose={() => setIsNewBroadcastOpen(false)}
        onCompleted={loadNewsFromApi}
      />

      <ChainPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        chainItems={chainItems}
      />

      {/* Doll Modal (Pure Doll entity editing/creation) */}
      <DollEditorModal
        isOpen={isDollEditorOpen}
        onClose={() => setIsDollEditorOpen(false)}
        doll={editingDoll}
        onSaveDoll={handleSaveDoll}
        onDeleteDoll={handleDeleteDoll}
      />

      <NewsDetailModal
        newsId={selectedNewsId}
        onClose={() => setSelectedNewsId(null)}
        onChanged={loadNewsFromApi}
      />

      {/* System API Key Settings Modal */}
      <ApiKeySettingsModal
        isOpen={isApiKeySettingsOpen}
        onClose={() => setIsApiKeySettingsOpen(false)}
      />
    </div>
  );
}
