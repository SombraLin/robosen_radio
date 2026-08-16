export type ViewTab =
  | 'dashboard'
  | 'channels'
  | 'channel-studio'
  | 'channel-templates'
  | 'news'
  | 'automation'
  | 'audio'
  | 'device'
  | 'atlas'
  | 'trash'
  | 'ai-config';

export type NewsCategory = '科技' | '政治' | '市场' | '文化' | '娱乐';
export type NewsStatus = '已就绪' | '草稿' | '处理中' | '生成中' | '已归档';

export type ChannelCategory =
  | '新闻频道'
  | '天气频道'
  | '电子宠物频道'
  | '故事频道'
  | '音乐频道'
  | '剧场频道'
  | '学习频道';

export type PlaylistItemType =
  | 'intro'
  | 'transition'
  | 'news_script'
  | 'weather_report'
  | 'commentary'
  | 'outro'
  | 'pet_event'
  | 'story_body'
  | 'music_track'
  | 'theater_act'
  | 'lesson_audio'
  | 'lesson_explanation'
  | 'learning_practice'
  | 'learning_quiz';

export interface PlaylistItem {
  id: string;
  type: PlaylistItemType;
  title: string;
  speakerRole?: string;
  durationSeconds: number;
  durationFormatted: string;
  timeSlot?: string;
  contentSnippet?: string;
  audioUrl?: string;
  isPlaying?: boolean;
}

export interface ChannelTemplateItem {
  id: string;
  itemKind: 'audio' | 'tts';
  audioType?: AudioType;
  ttsNodeType?: PlaylistItemType;
  speakerRole?: string;
  durationSeconds?: number;
  title?: string;
  description?: string;
}

export interface ChannelTemplate {
  id: string;
  name: string;
  description: string;
  category: ChannelCategory;
  createdAt: string;
  updatedAt: string;
  templateItems: ChannelTemplateItem[];
}

export interface GenerativeConfig {
  default_news_prompt: string;
  default_llm_provider: string;
  default_llm_model: string;
  default_tts_provider: string;
  default_voice_id: string;
  updated_at?: string;
}

export interface NewsClip {
  id: string;
  category: NewsCategory;
  title: string;
  content: string;
  durationSeconds: number;
  durationFormatted: string;
  role: string;
  status: NewsStatus;
  createdAt: string;
  audioUrl?: string;
  customPrompt?: string;
  llmModel?: string;
  ttsProvider?: string;
}

export interface BroadcastChainItem {
  id: string;
  type: 'music' | 'voice' | 'news';
  title: string;
  subtitle: string;
  durationSeconds: number;
  durationFormatted: string;
  clipId?: string;
}

export interface Channel {
  id: string;
  channel_id: string;
  channel_name: string;
  doll_id: string;
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
  ttsProvider?: 'edge' | 'bailian' | 'local';
  llmModel?: string;
  channels: Channel[];
  currentBroadcastProgress?: number;
  streamInfo?: string;
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  category: string;
  duration: string;
  status: '成功' | '失败' | '处理中';
  details?: string;
}

export interface PipelineConfig {
  newsScrapingInterval: number;
  newsScrapingMaxCount: number;
  commentaryInterval: number;
  commentaryTargetDolls: string[];
}

export type AudioCategory = ChannelCategory | '系统通用';
export type AudioType = '片头' | '转场音效' | '背景音乐' | '事件提示音' | '原声曲目' | '片尾谢幕';

export interface AudioAssetItem {
  id: string;
  title: string;
  category: AudioCategory | '系统音效' | '片头曲' | '背景乐' | '警报音';
  audioType?: AudioType;
  channelCategory?: AudioCategory;
  duration: string;
  durationSeconds?: number;
  tags: string[];
  usedInChannels?: string[];
  speakerOrSource?: string;
  url?: string;
  synthPreset?: 'jingle' | 'chime' | 'sweep' | 'lofi' | 'theater' | 'alert' | 'outro';
  sourceText?: string;
  ttsProvider?: string;
  voiceId?: string;
}
