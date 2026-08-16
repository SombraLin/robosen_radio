import { requestJson, uploadFile } from '../../shared/api/client';
import { AudioAssetItem } from './types';

export function getAudioAssetsApi(): Promise<AudioAssetItem[]> {
  return requestJson<AudioAssetItem[]>('/api/v1/radio-ai/audio-assets');
}

export function saveAudioAssetApi(asset: Partial<AudioAssetItem>): Promise<{ status: string; id: string }> {
  return requestJson('/api/v1/radio-ai/audio-assets', {
    method: 'POST',
    body: JSON.stringify(asset),
  });
}

export function deleteAudioAssetApi(urlOrId: string): Promise<{ status: string; deleted: string }> {
  return requestJson('/api/v1/radio-ai/audio-assets', {
    method: 'DELETE',
    body: JSON.stringify({ url: urlOrId }),
  });
}

export function uploadAudioAssetApi(file: File): Promise<{ status: string; url: string; filename: string; size_bytes: number }> {
  return uploadFile('/api/v1/radio-ai/audio-assets/upload', file, 'file');
}
