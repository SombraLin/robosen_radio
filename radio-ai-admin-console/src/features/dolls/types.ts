import { PlaylistItem, ChannelCategory, ChannelTemplate, ChannelTemplateItem } from '../../shared/types/playlist';

export interface Channel {
  id: string;
  channel_id: string; // e.g. "CH-ROBOT-A1"
  channel_name: string; // e.g. "新之助 - 康达姆机器人 A1 频道"
  doll_id: string; // e.g. "MINI-ROBOT-A1"
  model_name?: string;
  name: string;
  isLive: boolean;
  code: string;
  category?: ChannelCategory;
  categories: string[];
  prompt: string;
  introScript: string;
  outroScript: string;
  ttsProvider?: 'edge' | 'bailian' | 'local';
  speaker?: string;
  llmModel?: string;
  playlist?: PlaylistItem[];
}

export interface Doll {
  id: string;
  doll_id?: string;
  name: string;
  stationCode: string;
  tagline: string;
  roleTitle: string;
  status: 'online' | 'offline';
  avatarUrl: string;
  prompt?: string;
  series?: string;
  speaker?: string;
  agentAppId?: string;
  introScript?: string;
  outroScript?: string;
  ttsProvider?: 'edge' | 'bailian' | 'local';
  llmModel?: string;
  channels: Channel[];
  currentBroadcastProgress?: number;
  streamInfo?: string;
}

export type { ChannelTemplate, ChannelTemplateItem };
