import { useCallback } from 'react';
import { useAudioAssetStore } from './store';
import { useDollStore } from '../dolls/store';
import { AudioAssetItem } from './types';
import { isRadioAiApiEnabled } from '../../shared/api/client';
import {
  getAudioAssetsApi,
  saveAudioAssetApi,
  deleteAudioAssetApi,
  uploadAudioAssetApi,
} from './api';

export function useAudioAssetActions() {
  const { audioAssets, setAudioAssets, setLoading, setError } = useAudioAssetStore();
  const { dolls, setDolls } = useDollStore();

  const loadAudioAssets = useCallback(async () => {
    if (!isRadioAiApiEnabled()) return;
    setLoading(true);
    try {
      const data = await getAudioAssetsApi();
      if (Array.isArray(data) && data.length > 0) {
        setAudioAssets(data);
      }
    } catch (e: any) {
      console.error('加载音频资产失败:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [setAudioAssets, setLoading, setError]);

  const saveAsset = useCallback(
    async (asset: AudioAssetItem) => {
      setAudioAssets((prev) => {
        const index = prev.findIndex((a) => a.id === asset.id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = asset;
          return next;
        }
        return [asset, ...prev];
      });

      if (isRadioAiApiEnabled()) {
        try {
          await saveAudioAssetApi(asset);
        } catch (e) {
          console.warn('保存音频资产记录到数据库失败:', e);
        }
      }
    },
    [setAudioAssets]
  );

  const deleteAsset = useCallback(
    async (assetIdOrUrl: string) => {
      setAudioAssets((prev) => prev.filter((a) => a.id !== assetIdOrUrl && a.url !== assetIdOrUrl));
      if (isRadioAiApiEnabled()) {
        try {
          await deleteAudioAssetApi(assetIdOrUrl);
        } catch (e) {
          console.warn('从后端删除物理音频资产失败:', e);
        }
      }
    },
    [setAudioAssets]
  );

  const uploadFileAction = useCallback(async (file: File) => {
    return await uploadAudioAssetApi(file);
  }, []);

  const assignAssetToChannel = useCallback(
    (asset: AudioAssetItem, dollId: string, channelId: string) => {
      setDolls((prevDolls) =>
        prevDolls.map((d) => {
          if (d.id === dollId || d.doll_id === dollId) {
            const nextChannels = d.channels.map((c) => {
              if (c.id === channelId || c.channel_id === channelId) {
                const currentPlaylist = c.playlist || [];
                const newItem = {
                  id: `p-${Date.now()}`,
                  type: (asset.audioType === '片头'
                    ? 'intro'
                    : asset.audioType === '转场音效'
                    ? 'transition'
                    : asset.audioType === '片尾谢幕'
                    ? 'outro'
                    : 'music_track') as any,
                  title: asset.title,
                  speakerRole: asset.speakerOrSource || '系统音效',
                  durationSeconds: asset.durationSeconds || 10,
                  durationFormatted: asset.duration || '0:10',
                  contentSnippet: `[音频原声] ${asset.title}`,
                  audioUrl: asset.url,
                };
                return { ...c, playlist: [...currentPlaylist, newItem] };
              }
              return c;
            });
            return { ...d, channels: nextChannels };
          }
          return d;
        })
      );
    },
    [setDolls]
  );

  return {
    audioAssets,
    loadAudioAssets,
    saveAsset,
    deleteAsset,
    uploadFileAction,
    assignAssetToChannel,
  };
}
