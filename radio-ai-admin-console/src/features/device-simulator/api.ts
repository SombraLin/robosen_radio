import { requestJson } from '../../shared/api/client';

export function getDeviceDollChannelsApi(dollId: string): Promise<any> {
  return requestJson(`/api/v1/device/dolls/${encodeURIComponent(dollId)}/channels`);
}

export function reportDevicePlaybackStatusApi(payload: {
  device_sn: string;
  doll_id: string;
  channel_id: string;
  current_item_id: string;
  progress_seconds: number;
  status: string;
}): Promise<any> {
  return requestJson('/api/v1/device/playback/status', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function interruptionChatApi(payload: {
  doll_id: string;
  channel_id: string;
  current_item_id: string;
  play_offset_seconds: number;
  user_text: string;
  session_id?: string | null;
}): Promise<{ reply_text: string; reply_audio_url?: string | null; session_id: string }> {
  return requestJson('/api/v1/device/playback/interruption-chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
