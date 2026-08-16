import { requestJson, isRadioAiApiEnabled } from '../../shared/api/client';
import { AdminNewsPageDto, AdminNewsDetailDto } from './types';

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
      return await requestJson<AdminNewsPageDto>(`/api/v1/admin/news?${query.toString()}`);
    } catch (e) {
      console.warn('获取后端新闻失败，降级返回 Mock 新闻数据:', e);
    }
  }

  return {
    items: [],
    page: 1,
    page_size: 100,
    total: 0,
    pages: 1,
  };
}

export function getNewsDetail(newsId: string): Promise<AdminNewsDetailDto> {
  return requestJson<AdminNewsDetailDto>(`/api/v1/admin/news/${encodeURIComponent(newsId)}`);
}

export function updateNewsScript(newsId: string, text: string): Promise<AdminNewsDetailDto> {
  return requestJson<AdminNewsDetailDto>(`/api/v1/admin/news/${encodeURIComponent(newsId)}/script`, {
    method: 'PATCH',
    body: JSON.stringify({ text }),
  });
}

export function trashNews(newsId: string): Promise<AdminNewsDetailDto> {
  return requestJson<AdminNewsDetailDto>(`/api/v1/admin/news/${encodeURIComponent(newsId)}/trash`, {
    method: 'POST',
  });
}

export function restoreNews(newsId: string): Promise<AdminNewsDetailDto> {
  return requestJson<AdminNewsDetailDto>(`/api/v1/admin/news/${encodeURIComponent(newsId)}/restore`, {
    method: 'POST',
  });
}

export function runNewsPipeline(payload: {
  tag?: string;
  limit?: number;
  generate_script?: boolean;
  generate_audio?: boolean;
  generate_commentary?: boolean;
  custom_prompt?: string;
  llm_model?: string;
  tts_provider?: string;
  voice_id?: string;
}): Promise<any> {
  return requestJson('/api/v1/radio-ai/news/pipeline', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
