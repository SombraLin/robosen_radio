import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { useDollActions } from './features/dolls/hooks';
import { useNewsActions } from './features/news-console/hooks';
import { useAudioAssetActions } from './features/audio-assets/hooks';
import { useApiKeyStore } from './shared/store/useApiKeyStore';
import { useAuthStore } from './shared/store/useAuthStore';

// Global Modals
import { DollEditorModal } from './components/modals/DollEditorModal';
import { NewBroadcastModal } from './components/modals/NewBroadcastModal';
import { NewsDetailModal } from './components/modals/NewsDetailModal';
import { ChainPreviewModal } from './components/modals/ChainPreviewModal';
import { AudioEditorModal } from './components/modals/AudioEditorModal';
import { AssignToChannelModal } from './components/modals/AssignToChannelModal';
import { ApiKeySettingsModal } from './components/modals/ApiKeySettingsModal';
import { LoginModal } from './components/modals/LoginModal';

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return '系统运行状态概览';
  if (pathname.startsWith('/channels/studio') || pathname.startsWith('/channel-studio')) return '频道编排 Studio';
  if (pathname.startsWith('/templates') || pathname.startsWith('/channel-templates')) return '频道模版库';
  if (pathname.startsWith('/atlas') || pathname.startsWith('/doll-atlas')) return '玩偶图鉴与动作抠图';
  if (pathname.startsWith('/channels')) return '全量玩偶频道总控台';
  if (pathname.startsWith('/news')) return '新闻控制台 & 导播特刊';
  if (pathname.startsWith('/automation')) return '自动化任务与调度中心';
  if (pathname.startsWith('/audio')) return '系统与玩偶音频资产库';
  if (pathname.startsWith('/device')) return '物理设备与播报模拟器';
  if (pathname.startsWith('/ai-config')) return 'AI 模型与音色配置';
  if (pathname.startsWith('/logs')) return '系统实时运行日志';
  if (pathname.startsWith('/trash')) return '新闻回收站';
  return 'RADIO AI 频道总编室';
}

export const App: React.FC = () => {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const { loadDolls } = useDollActions();
  const { loadNews } = useNewsActions();
  const { loadAudioAssets } = useAudioAssetActions();
  const loadApiKeyConfig = useApiKeyStore((s) => s.loadFromStorageAndApi);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    // Initial data hydration from backend APIs
    checkAuth();
    loadDolls();
    loadNews();
    loadAudioAssets();
    loadApiKeyConfig();
  }, [checkAuth, loadDolls, loadNews, loadAudioAssets, loadApiKeyConfig]);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-serif-editorial">
      {/* Navigation Sidebar */}
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:ml-[280px] h-full overflow-hidden min-w-0">
        <Header
          pageTitle={pageTitle}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Global Modals Mounted at Root */}
      <DollEditorModal />
      <NewBroadcastModal />
      <NewsDetailModal />
      <ChainPreviewModal />
      <AudioEditorModal />
      <AssignToChannelModal />
      <ApiKeySettingsModal />
      <LoginModal />
    </div>
  );
};

export default App;
