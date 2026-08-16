export type ViewTab = 'dashboard' | 'channels' | 'channel-studio' | 'channel-templates' | 'news' | 'automation' | 'audio' | 'device' | 'atlas' | 'trash' | 'ai-config' | 'logs';

export type NewsCategory = '科技' | '政治' | '市场' | '文化' | '娱乐';
export type NewsStatus = '已就绪' | '草稿' | '处理中' | '生成中' | '已归档' | '生成失败';


export type ChannelCategory = '新闻频道' | '天气频道' | '电子宠物频道' | '故事频道' | '音乐频道' | '剧场频道' | '学习频道';

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
  speakerRole?: string; // e.g., "男主持人", "女主持人", "草莓熊 (玩偶)", "动感超人"
  durationSeconds: number;
  durationFormatted: string;
  timeSlot?: string; // e.g. "07:00", "09:00", "12:00", "15:00", "18:00", "22:00" for 电子宠物频道
  contentSnippet?: string;
  audioUrl?: string;
  isPlaying?: boolean;
}


export interface ChannelTemplateItem {
  id: string;
  itemKind: 'audio' | 'tts'; // 纯物理音频内容还是大模型TTS生成内容
  audioType?: AudioType; // 对于 itemKind === 'audio', 指定所需的音频类型(片头, 转场等)
  ttsNodeType?: PlaylistItemType; // 对于 itemKind === 'tts', 指定其节点类型(开场, 新闻, 点评等)
  speakerRole?: string; // 对于 TTS 内容, 期望的角色(如 主播/玩偶)
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
  durationSeconds: number; // in seconds
  durationFormatted: string; // e.g. "0:45"
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
  channel_id: string; // 频道唯一标识 (e.g. "CH-ROBOT-A1")
  channel_name: string; // 频道名称 (e.g. "新之助 - 康达姆机器人 A1 频道")
  doll_id: string; // 频道绑定的模型 ID (e.g. "MINI-ROBOT-A1")
  model_name?: string; // 模型名称 / doll_id
  name: string; // 频道名称 (兼容 name 字段)
  isLive: boolean;
  code: string; // 频道代号 (e.g. "CH-ROBOT-A1")
  category?: ChannelCategory; // 频道类别: 新闻频道 | 天气频道 | 电子宠物频道 | 故事频道 | 音乐频道 | 剧场频道 | 学习频道
  categories: string[];
  prompt: string;
  introScript: string;
  outroScript: string;
  ttsProvider?: 'edge' | 'bailian' | 'local';
  speaker?: string;
  llmModel?: string;
  playlist?: PlaylistItem[]; // 该频道对应的播放列表结构/时间线
}

export interface Doll {
  id: string;
  doll_id?: string;
  name: string; // e.g. "NOVA", "ATLAS"
  stationCode: string; // e.g. "STATION_01"
  tagline: string; // e.g. "Tech & Culture Broadcaster"
  roleTitle: string; // e.g. "Primary Anchor"
  status: 'online' | 'offline';
  avatarUrl: string;
  prompt?: string;
  series?: string;
  speaker?: string;
  ttsProvider?: 'edge' | 'bailian' | 'local';
  llmModel?: string;
  channels: Channel[];
  currentBroadcastProgress?: number; // 0 - 100
  streamInfo?: string; // e.g. "1080p | Latency: 12ms"
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  category: string;
  duration?: string;
  status?: '成功' | '失败' | '处理中';
  details?: string;
  level?: 'info' | 'warn' | 'error' | 'success';
  source?: 'backend' | 'tts' | 'crawler' | 'ui';
  text?: string;
}

export interface PipelineConfig {
  newsScrapingInterval: number; // mins
  newsScrapingMaxCount: number;
  commentaryInterval: number; // mins
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
