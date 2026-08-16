import { create } from 'zustand';
import { AudioAssetItem } from './types';
import { INITIAL_AUDIO_ASSETS } from '../../data/mockData';

interface AudioAssetState {
  audioAssets: AudioAssetItem[];
  selectedAsset: AudioAssetItem | null;
  isAudioEditorOpen: boolean;
  isAssignModalOpen: boolean;
  assignTargetAsset: AudioAssetItem | null;
  isLoading: boolean;
  error: string | null;

  setAudioAssets: (assets: AudioAssetItem[] | ((prev: AudioAssetItem[]) => AudioAssetItem[])) => void;
  setSelectedAsset: (asset: AudioAssetItem | null) => void;
  openAudioEditor: (asset?: AudioAssetItem | null) => void;
  closeAudioEditor: () => void;
  openAssignModal: (asset: AudioAssetItem) => void;
  closeAssignModal: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAudioAssetStore = create<AudioAssetState>((set) => {
  const initialAssets: AudioAssetItem[] = (() => {
    try {
      const saved = localStorage.getItem('radio_ai_audio_assets');
      return saved ? JSON.parse(saved) : INITIAL_AUDIO_ASSETS;
    } catch {
      return INITIAL_AUDIO_ASSETS;
    }
  })();

  return {
    audioAssets: initialAssets,
    selectedAsset: null,
    isAudioEditorOpen: false,
    isAssignModalOpen: false,
    assignTargetAsset: null,
    isLoading: false,
    error: null,

    setAudioAssets: (updater) =>
      set((state) => {
        const nextAssets = typeof updater === 'function' ? updater(state.audioAssets) : updater;
        try {
          localStorage.setItem('radio_ai_audio_assets', JSON.stringify(nextAssets));
        } catch (e) {
          console.error('Failed to save audio assets to localStorage:', e);
        }
        return { audioAssets: nextAssets };
      }),
    setSelectedAsset: (asset) => set({ selectedAsset: asset }),
    openAudioEditor: (asset = null) =>
      set({ isAudioEditorOpen: true, selectedAsset: asset }),
    closeAudioEditor: () =>
      set({ isAudioEditorOpen: false, selectedAsset: null }),
    openAssignModal: (asset) =>
      set({ isAssignModalOpen: true, assignTargetAsset: asset }),
    closeAssignModal: () =>
      set({ isAssignModalOpen: false, assignTargetAsset: null }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
  };
});
