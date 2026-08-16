export * from './playlist';

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
  | 'ai-config'
  | 'logs';

export interface GenerativeConfig {
  default_news_prompt: string;
  default_llm_provider: string;
  default_llm_model: string;
  default_tts_provider: string;
  default_voice_id: string;
  dashscope_api_key?: string;
  updated_at?: string;
}
