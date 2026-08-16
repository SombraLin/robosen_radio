import React from 'react';
import { RouteObject, Navigate } from 'react-router-dom';
import App from './App';
import { DashboardView } from './components/views/DashboardView';
import { ChannelsView } from './components/views/ChannelsView';
import { ChannelStudioView } from './components/views/ChannelStudioView';
import { ChannelTemplatesView } from './components/views/ChannelTemplatesView';
import { DollAtlasStudioView } from './components/views/DollAtlasStudioView';
import { NewsConsoleView } from './components/views/NewsConsoleView';
import { AudioAssetsView } from './components/views/AudioAssetsView';
import { AutomationView } from './components/views/AutomationView';
import { DeviceSimulatorView } from './components/views/DeviceSimulatorView';
import { AiConfigView } from './components/views/AiConfigView';
import { LogsView } from './components/views/LogsView';
import { TrashView } from './components/views/TrashView';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/channels" replace /> },
      { path: 'dashboard', element: <DashboardView /> },
      { path: 'channels', element: <ChannelsView /> },
      { path: 'channels/studio/:dollId?/:channelId?', element: <ChannelStudioView /> },
      { path: 'channel-studio', element: <ChannelStudioView /> },
      { path: 'templates', element: <ChannelTemplatesView /> },
      { path: 'channel-templates', element: <ChannelTemplatesView /> },
      { path: 'atlas', element: <DollAtlasStudioView /> },
      { path: 'doll-atlas', element: <DollAtlasStudioView /> },
      { path: 'news', element: <NewsConsoleView /> },
      { path: 'automation', element: <AutomationView /> },
      { path: 'audio', element: <AudioAssetsView /> },
      { path: 'audio-assets', element: <AudioAssetsView /> },
      { path: 'device', element: <DeviceSimulatorView /> },
      { path: 'device-simulator', element: <DeviceSimulatorView /> },
      { path: 'ai-config', element: <AiConfigView /> },
      { path: 'logs', element: <LogsView /> },
      { path: 'trash', element: <TrashView /> },
      { path: '*', element: <Navigate to="/channels" replace /> },
    ],
  },
];
