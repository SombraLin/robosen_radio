export type NewsCategory = '科技' | '政治' | '市场' | '文化' | '娱乐';
export type NewsStatus = '已就绪' | '草稿' | '处理中' | '生成中' | '已归档';

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

export interface PipelineConfig {
  newsScrapingInterval: number;
  newsScrapingMaxCount: number;
  commentaryInterval: number;
  commentaryTargetDolls: string[];
}

export interface AdminNewsSummaryDto {
  id: string;
  title: string;
  source: string;
  tag: string;
  published_at: string | null;
  script_status: string;
  audio_status: string;
  commentary_count: number;
  commentary_ready_count: number;
  updated_at: string;
  deleted_at: string | null;
}

export interface AdminNewsPageDto {
  items: AdminNewsSummaryDto[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export interface AdminAudioDto {
  id: string | null;
  status: string;
  upload_status: string;
  local_url: string | null;
  duration_seconds: number | null;
  voice_id: string | null;
  failure_message: string | null;
}

export interface AdminCommentaryDto {
  id: string;
  doll_id: string;
  commentary_text: string;
  status: string;
  updated_at: string;
  audio: AdminAudioDto;
}

export interface AdminNewsDetailDto extends AdminNewsSummaryDto {
  url: string | null;
  raw_summary: string | null;
  language: string;
  script_text: string;
  audio: AdminAudioDto;
  commentaries: AdminCommentaryDto[];
  custom_prompt?: string | null;
  llm_model?: string | null;
  tts_provider?: string | null;
}
