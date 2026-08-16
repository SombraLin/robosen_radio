export type ChannelCategory =
  | '新闻频道'
  | '天气频道'
  | '电子宠物频道'
  | '故事频道'
  | '音乐频道'
  | '剧场频道'
  | '学习频道';

export const CHANNEL_CATEGORIES: ChannelCategory[] = [
  '新闻频道',
  '天气频道',
  '电子宠物频道',
  '故事频道',
  '音乐频道',
  '剧场频道',
  '学习频道',
];

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

export type AudioCategory = ChannelCategory | '系统通用';
export type AudioType = '片头' | '转场音效' | '背景音乐' | '事件提示音' | '原声曲目' | '片尾谢幕';

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
