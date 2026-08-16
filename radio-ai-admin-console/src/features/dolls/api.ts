import { requestJson } from '../../shared/api/client';
import { Doll, Channel } from './types';

export function getDollsApi(): Promise<Doll[]> {
  return requestJson('/api/v1/radio-ai/dolls');
}

export function saveDollApi(dollId: string, dollData: Partial<Doll>): Promise<{ status: string; id: string; doll_id: string }> {
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollId)}`, {
    method: 'PUT',
    body: JSON.stringify(dollData),
  });
}

export function deleteDollApi(dollId: string): Promise<{ status: string }> {
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollId)}`, {
    method: 'DELETE',
  });
}

export function saveChannelApi(dollId: string, channel: Channel): Promise<{ status: string; channel_id: string }> {
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollId)}/channels/${encodeURIComponent(channel.id)}`, {
    method: 'PUT',
    body: JSON.stringify(channel),
  });
}

export function freezeChannelApi(
  dollId: string,
  channelId: string,
  channelData: Channel
): Promise<{ status: string; doll_id: string; channel_id: string; manifest_url: string; playlist: any[]; manifest: any }> {
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

export function saveAvatarApi(dollId: string, imageBase64: string): Promise<{ status: string; avatar_url: string; doll_id: string }> {
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollId)}/avatar`, {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
}

export function getChannelManifestApi(dollId: string, channelId: string): Promise<any> {
  return requestJson(`/api/v1/radio-ai/dolls/${encodeURIComponent(dollId)}/channels/${encodeURIComponent(channelId)}/manifest`);
}
