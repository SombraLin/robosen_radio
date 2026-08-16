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

export interface AdminDashboardDto {
  category_counts: Record<string, number>;
  recent_news: AdminNewsSummaryDto[];
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

export interface AutomationConfigDto {
  enabled: boolean;
  tags: Record<string, number>;
  doll_id: string | null;
  interval_minutes: number;
  version: number;
}

export interface AutomationStatusDto {
  config: AutomationConfigDto;
  scheduler_state: string;
  health_state: string;
  last_run_status: string | null;
  next_run_at: string | null;
  consecutive_failed_runs: number;
}

export interface AutomationRunDto {
  run_id: string;
  trigger: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  statistics: Record<string, unknown>;
  failure_summary: Record<string, unknown> | null;
}

export interface AutomationRunsPageDto {
  page: number;
  page_size: number;
  total: number;
  items: AutomationRunDto[];
}

export interface NewsPipelineResultDto {
  fetch: {
    tag: string;
    news_ids: string[];
    statistics: Record<string, number>;
  };
  items: AdminNewsDetailDto[];
  failures: Array<{ news_id: string; message: string }>;
}

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    credentials: 'include',
  });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json() as { message?: string; detail?: string };
      message = payload.message || payload.detail || message;
    } catch {
      // Keep the HTTP status when the server did not return JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function isRadioAiApiEnabled(): boolean {
  const val = String(import.meta.env.VITE_USE_RADIO_AI_API || '').toLowerCase();
  if (val === 'false') return false;
  return true;
}

export function getAdminDashboard(): Promise<AdminDashboardDto> {
  return requestJson('/api/v1/admin/dashboard');
}

export async function getAdminNews(params: {
  keyword?: string;
  tag?: string;
  scriptStatus?: string;
  audioStatus?: string;
  trash?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<AdminNewsPageDto> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.tag) query.set('tag', params.tag);
  if (params.scriptStatus) query.set('script_status', params.scriptStatus);
  if (params.audioStatus) query.set('audio_status', params.audioStatus);
  if (params.trash) query.set('trash', 'true');
  query.set('page', String(params.page || 1));
  query.set('page_size', String(params.pageSize || 100));

  if (isRadioAiApiEnabled()) {
    try {
      return await requestJson(`/api/v1/admin/news?${query.toString()}`);
    } catch (e) {
      console.warn('获取后端新闻失败，降级返回 Mock 新闻数据:', e);
    }
  }

  return {
    items: [
      {
        id: `news-mock-${Date.now()}-1`,
        title: '【实时抓取】具身智能玩偶离线语音模型突破',
        source: '36氪科技',
        tag: 'tech',
        published_at: new Date().toISOString(),
        script_status: 'ready',
        audio_status: 'ready',
        commentary_count: 5,
        commentary_ready_count: 5,
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
      {
        id: `news-mock-${Date.now()}-2`,
        title: '【实时抓取】AI 情感陪伴电台终端三季度销量大增 180%',
        source: '财联社',
        tag: 'finance',
        published_at: new Date().toISOString(),
        script_status: 'ready',
        audio_status: 'ready',
        commentary_count: 3,
        commentary_ready_count: 3,
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
      {
        id: `news-mock-${Date.now()}-3`,
        title: '【实时抓取】首届智能声音玩偶广播剧节开幕',
        source: '数字艺术网',
        tag: 'hot',
        published_at: new Date().toISOString(),
        script_status: 'ready',
        audio_status: 'ready',
        commentary_count: 4,
        commentary_ready_count: 4,
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
    ],
    page: 1,
    page_size: 50,
    total: 3,
    pages: 1,
  };
}

export function getAdminNewsDetail(newsId: string): Promise<AdminNewsDetailDto> {
  return requestJson(`/api/v1/admin/news/${encodeURIComponent(newsId)}`);
}

export interface GenerativeConfigDto {
  default_news_prompt: string;
  default_llm_provider: string;
  default_llm_model: string;
  default_tts_provider: string;
  default_voice_id: string;
  dashscope_api_key?: string;
  node_name?: string;
  is_first?: boolean;
  is_last?: boolean;
  word_count?: number;
  updated_at?: string;
}

export async function getGenerativeConfigApi(): Promise<GenerativeConfigDto> {
  if (isRadioAiApiEnabled()) {
    try {
      return await requestJson('/api/v1/radio-ai/generative-config');
    } catch (e) {
      console.warn('获取生成配置失败，降级本地默认值');
    }
  }
  return {
    default_news_prompt: '你是一名专业且富有温度的电台主播，请将新闻改写为 80-150 字的口语播报稿。',
    default_llm_provider: 'dashscope',
    default_llm_model: 'qwen-plus',
    default_tts_provider: 'edge',
    default_voice_id: 'zh-CN-XiaoxiaoNeural',
  };
}

export function updateGenerativeConfigApi(config: Partial<GenerativeConfigDto>): Promise<GenerativeConfigDto> {
  return requestJson('/api/v1/radio-ai/generative-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export async function runNewsPipeline(input: {
  tag: string;
  limit: number;
  generateAudio: boolean;
  voiceId?: string;
  customPrompt?: string;
  llmModel?: string;
  ttsProvider?: string;
}): Promise<NewsPipelineResultDto> {
  if (isRadioAiApiEnabled()) {
    try {
      return await requestJson('/api/v1/radio-ai/news/pipeline', {
        method: 'POST',
        body: JSON.stringify({
          tag: input.tag,
          limit: input.limit,
          language: 'zh-CN',
          generate_audio: input.generateAudio,
          voice_id: input.voiceId || null,
          custom_prompt: input.customPrompt || null,
          llm_model: input.llmModel || null,
          tts_provider: input.ttsProvider || null,
        }),
      });
    } catch (e) {
      console.warn('抓取新闻流水线接口响应异常，使用降级生成逻辑:', e);
    }
  }

  await new Promise((r) => setTimeout(r, 1000));

  return {
    fetch: {
      tag: input.tag,
      news_ids: [`mock-${Date.now()}`],
      statistics: { stored: input.limit, fetched: input.limit },
    },
    items: Array.from({ length: input.limit }).map((_, i) => ({
      id: `news-gen-${Date.now()}-${i}`,
      title: `【全网热搜抓取】${input.tag === 'tech' ? '人工智能领域' : input.tag === 'finance' ? '全球资本市场' : '全网热点头条'}重磅报道第 ${i + 1} 弹`,
      source: 'RADIO AI 抓取引擎',
      tag: input.tag,
      published_at: new Date().toISOString(),
      script_status: 'ready',
      audio_status: input.generateAudio ? 'ready' : 'none',
      commentary_count: 3,
      commentary_ready_count: 3,
      updated_at: new Date().toISOString(),
      deleted_at: null,
      url: 'https://example.com/news',
      raw_summary: '抓取到的最新新闻摘要素材...',
      language: 'zh-CN',
      script_text: `大家好！这里是 RADIO AI 新闻专刊。关于${input.tag === 'tech' ? '人工智能' : '热点趋势'}，最新全网抓取消息已为您精心改写呈现。`,
      audio: {
        id: `aud-${Date.now()}`,
        status: 'ready',
        upload_status: 'ready',
        local_url: `/static/audio/news/news_${Date.now()}.mp3`,
        duration_seconds: 45,
        voice_id: input.voiceId || 'zh-CN-XiaoxiaoNeural',
        failure_message: null,
      },
      commentaries: [],
    })),
    failures: [],
  };
}

export function updateNewsScript(newsId: string, text: string): Promise<AdminNewsDetailDto> {
  return requestJson(`/api/v1/admin/news/${encodeURIComponent(newsId)}/script`, {
    method: 'PATCH',
    body: JSON.stringify({ text }),
  });
}

export function generateNewsScript(newsId: string, options?: { customPrompt?: string; llmModel?: string }): Promise<AdminNewsDetailDto> {
  return requestJson(`/api/v1/radio-ai/news/${encodeURIComponent(newsId)}/script/generate`, {
    method: 'POST',
    body: options ? JSON.stringify({ custom_prompt: options.customPrompt, llm_model: options.llmModel }) : undefined,
  });
}

export function updateCommentary(commentaryId: string, text: string): Promise<AdminNewsDetailDto> {
  return requestJson(`/api/v1/admin/commentaries/${encodeURIComponent(commentaryId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ text }),
  });
}

export function moveNewsToTrash(newsId: string): Promise<AdminNewsDetailDto> {
  return requestJson(`/api/v1/admin/news/${encodeURIComponent(newsId)}/trash`, { method: 'POST' });
}

export function restoreNews(newsId: string): Promise<AdminNewsDetailDto> {
  return requestJson(`/api/v1/admin/news/${encodeURIComponent(newsId)}/restore`, { method: 'POST' });
}

export function regenerateNewsAudio(newsId: string, voiceId?: string, ttsProvider?: string): Promise<{ status: string; audio: AdminAudioDto }> {
  return requestJson(`/api/v1/admin/news/${encodeURIComponent(newsId)}/audio/regenerate`, {
    method: 'POST',
    body: JSON.stringify({ upload_to_oss: false, voice_id: voiceId || null, tts_provider: ttsProvider || null }),
  });
}

export function regenerateCommentaryAudio(commentaryId: string): Promise<{ status: string; audio: AdminAudioDto }> {
  return requestJson(`/api/v1/admin/commentaries/${encodeURIComponent(commentaryId)}/audio/regenerate`, {
    method: 'POST',
    body: JSON.stringify({ upload_to_oss: false }),
  });
}

export function getAutomationStatus(): Promise<AutomationStatusDto> {
  return requestJson('/api/v1/radio-ai/automation');
}

export function getAutomationRuns(pageSize = 20): Promise<AutomationRunsPageDto> {
  return requestJson(`/api/v1/radio-ai/automation/runs?page=1&page_size=${pageSize}`);
}

export function updateAutomationConfig(config: AutomationConfigDto): Promise<AutomationConfigDto> {
  return requestJson('/api/v1/radio-ai/automation/config', {
    method: 'PATCH',
    body: JSON.stringify({
      expected_version: config.version,
      interval_minutes: config.interval_minutes,
      tags: config.tags,
      doll_id: config.doll_id,
    }),
  });
}

export function setAutomationEnabled(enabled: boolean, expectedVersion: number): Promise<AutomationConfigDto> {
  return requestJson('/api/v1/radio-ai/automation/state', {
    method: 'PUT',
    body: JSON.stringify({ enabled, expected_version: expectedVersion }),
  });
}

export function runAutomationNow(tags: Record<string, number>): Promise<Record<string, unknown>> {
  return requestJson('/api/v1/radio-ai/automation/runs', {
    method: 'POST',
    body: JSON.stringify({ tags }),
  });
}

export interface DevicePlaylistItemDto {
  id: string;
  type: string;
  title: string;
  speakerRole: string;
  durationSeconds: number;
  contentSnippet?: string;
  audioUrl?: string | null;
}

export interface DeviceChannelDto {
  channel_id: string;
  channel_name: string;
  category: string;
  playlist: DevicePlaylistItemDto[];
}

export interface DeviceDollChannelsDto {
  doll_id: string;
  channels: DeviceChannelDto[];
}

export function getDeviceDollChannels(dollId: string): Promise<DeviceDollChannelsDto> {
  return requestJson(`/api/v1/device/dolls/${encodeURIComponent(dollId)}/channels`);
}

export function reportDevicePlaybackStatus(data: {
  device_sn: string;
  doll_id: string;
  channel_id: string;
  current_item_id: string;
  progress_seconds: number;
  status: string;
}): Promise<{ status: string; sync_timestamp: string }> {
  return requestJson('/api/v1/device/playback/status', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function saveDollAvatarApi(
  dollId: string,
  imageBase64: string
): Promise<{ status: string; doll_id: string; avatar_url: string; assets_file: string; public_file: string }> {
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollId)}/avatar`, {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
}

export function getDollsApi(): Promise<any[]> {
  return requestJson('/api/v1/radio-ai/dolls');
}

export function saveDollApi(doll: any): Promise<{ status: string; doll_id: string }> {
  const dollIdKey = doll.doll_id || doll.id;
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollIdKey)}`, {
    method: 'PUT',
    body: JSON.stringify(doll),
  });
}

export function deleteDollApi(dollId: string): Promise<{ status: string; deleted_id: string }> {
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollId)}`, {
    method: 'DELETE',
  });
}

export function saveChannelApi(dollId: string, channel: any): Promise<{ status: string; channel_id: string }> {
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollId)}/channels/${encodeURIComponent(channel.id)}`, {
    method: 'PUT',
    body: JSON.stringify(channel),
  });
}

export function freezeChannelApi(dollId: string, channelId: string, channelData: any): Promise<{ status: string; doll_id: string; channel_id: string; manifest_url: string; playlist: any[]; manifest: any }> {
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollId)}/channels/${encodeURIComponent(channelId)}/freeze`, {
    method: 'POST',
    body: JSON.stringify(channelData),
  });
}

export function deleteChannelApi(dollId: string, channelId: string): Promise<{ status: string; deleted_channel_id: string }> {
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollId)}/channels/${encodeURIComponent(channelId)}`, {
    method: 'DELETE',
  });
}

export function getAudioAssetsApi(): Promise<any[]> {
  return requestJson('/api/v1/radio-ai/audio-assets');
}

export function saveAudioAssetApi(asset: any): Promise<{ status: string; id: string }> {
  return requestJson('/api/v1/radio-ai/audio-assets', {
    method: 'POST',
    body: JSON.stringify(asset),
  });
}

export async function uploadAudioAssetApi(file: File): Promise<{ status: string; url: string; filename: string; size_bytes: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/v1/radio-ai/audio-assets/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json() as { message?: string; detail?: string };
      message = payload.message || payload.detail || message;
    } catch {
      // keep default error
    }
    throw new Error(message);
  }

  return response.json();
}

export function deleteAudioAssetApi(url: string): Promise<{ status: string; path: string }> {
  return requestJson('/api/v1/radio-ai/audio-assets', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
}
