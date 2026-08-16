import { useCallback } from 'react';
import { useDollStore } from './store';
import { Doll, Channel } from './types';
import { isRadioAiApiEnabled } from '../../shared/api/client';
import {
  getDollsApi,
  saveDollApi,
  deleteDollApi,
  saveChannelApi,
  deleteChannelApi,
  freezeChannelApi,
  saveAvatarApi,
} from './api';

export function useDollActions() {
  const { dolls, setDolls, setLoading, setError } = useDollStore();

  const loadDolls = useCallback(async () => {
    if (!isRadioAiApiEnabled()) return;
    setLoading(true);
    try {
      const data = await getDollsApi();
      if (Array.isArray(data) && data.length > 0) {
        setDolls(data);
      }
    } catch (e: any) {
      console.error('加载玩偶与频道配置失败，使用本地预设:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [setDolls, setLoading, setError]);

  const saveDoll = useCallback(
    async (dollData: Doll) => {
      // Optimistic update
      setDolls((prev) => {
        const index = prev.findIndex((d) => d.id === dollData.id || d.doll_id === dollData.id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = { ...next[index], ...dollData };
          return next;
        }
        return [...prev, dollData];
      });

      if (isRadioAiApiEnabled()) {
        try {
          const targetKey = dollData.doll_id || dollData.id;
          await saveDollApi(targetKey, dollData);
        } catch (e: any) {
          console.error('持久化玩偶配置失败:', e);
          alert(`保存到后端失败: ${e.message}`);
        }
      }
    },
    [setDolls]
  );

  const deleteDoll = useCallback(
    async (dollId: string) => {
      setDolls((prev) => prev.filter((d) => d.id !== dollId && d.doll_id !== dollId));
      if (isRadioAiApiEnabled()) {
        try {
          await deleteDollApi(dollId);
        } catch (e: any) {
          console.error('删除玩偶失败:', e);
        }
      }
    },
    [setDolls]
  );

  const saveChannel = useCallback(
    async (dollId: string, channel: Channel) => {
      setDolls((prev) =>
        prev.map((d) => {
          if (d.id === dollId || d.doll_id === dollId) {
            const existingChannelIndex = d.channels.findIndex(
              (c) => c.id === channel.id || c.channel_id === channel.channel_id
            );
            let nextChannels = [...d.channels];
            if (existingChannelIndex !== -1) {
              nextChannels[existingChannelIndex] = channel;
            } else {
              nextChannels.push(channel);
            }
            return { ...d, channels: nextChannels };
          }
          return d;
        })
      );

      if (isRadioAiApiEnabled()) {
        try {
          await saveChannelApi(dollId, channel);
        } catch (e: any) {
          console.error('保存频道到后端失败:', e);
        }
      }
    },
    [setDolls]
  );

  const deleteChannel = useCallback(
    async (dollId: string, channelId: string) => {
      setDolls((prev) =>
        prev.map((d) => {
          if (d.id === dollId || d.doll_id === dollId) {
            return {
              ...d,
              channels: d.channels.filter(
                (c) => c.id !== channelId && c.channel_id !== channelId
              ),
            };
          }
          return d;
        })
      );

      if (isRadioAiApiEnabled()) {
        try {
          await deleteChannelApi(dollId, channelId);
        } catch (e: any) {
          console.error('删除频道失败:', e);
        }
      }
    },
    [setDolls]
  );

  const freezeChannel = useCallback(
    async (dollId: string, channelId: string, channelData: Channel) => {
      if (isRadioAiApiEnabled()) {
        const res = await freezeChannelApi(dollId, channelId, channelData);
        if (res && res.playlist && res.playlist.length > 0) {
          channelData.playlist = res.playlist;
        }
      }
      await saveChannel(dollId, channelData);
      return channelData;
    },
    [saveChannel]
  );

  const uploadAvatar = useCallback(
    async (dollId: string, imageBase64: string) => {
      if (isRadioAiApiEnabled()) {
        const res = await saveAvatarApi(dollId, imageBase64);
        if (res && res.avatar_url) {
          setDolls((prev) =>
            prev.map((d) =>
              d.id === dollId || d.doll_id === dollId ? { ...d, avatarUrl: res.avatar_url } : d
            )
          );
          return res.avatar_url;
        }
      }
      return null;
    },
    [setDolls]
  );

  return {
    dolls,
    loadDolls,
    saveDoll,
    deleteDoll,
    saveChannel,
    deleteChannel,
    freezeChannel,
    uploadAvatar,
  };
}
