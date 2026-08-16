import { AudioCategory, AudioType } from '../../shared/types/playlist';

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

export type { AudioCategory, AudioType };
