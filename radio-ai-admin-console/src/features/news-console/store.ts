import { create } from 'zustand';
import { NewsClip, BroadcastChainItem, PipelineConfig, AdminNewsDetailDto } from './types';
import {
  INITIAL_NEWS_CLIPS,
  INITIAL_CHAIN_ITEMS,
  INITIAL_PIPELINE_CONFIG,
} from '../../data/mockData';

interface NewsState {
  newsClips: NewsClip[];
  chainItems: BroadcastChainItem[];
  pipelineConfig: PipelineConfig;
  selectedClip: NewsClip | null;
  selectedNewsDetail: AdminNewsDetailDto | null;
  isNewBroadcastOpen: boolean;
  isPreviewModalOpen: boolean;
  isNewsDetailOpen: boolean;
  isLoading: boolean;
  error: string | null;

  setNewsClips: (clips: NewsClip[] | ((prev: NewsClip[]) => NewsClip[])) => void;
  setChainItems: (items: BroadcastChainItem[] | ((prev: BroadcastChainItem[]) => BroadcastChainItem[])) => void;
  setPipelineConfig: (config: PipelineConfig) => void;
  setSelectedClip: (clip: NewsClip | null) => void;
  setSelectedNewsDetail: (detail: AdminNewsDetailDto | null) => void;
  setIsNewBroadcastOpen: (open: boolean) => void;
  setIsPreviewModalOpen: (open: boolean) => void;
  setIsNewsDetailOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useNewsStore = create<NewsState>((set) => ({
  newsClips: INITIAL_NEWS_CLIPS,
  chainItems: INITIAL_CHAIN_ITEMS,
  pipelineConfig: INITIAL_PIPELINE_CONFIG,
  selectedClip: null,
  selectedNewsDetail: null,
  isNewBroadcastOpen: false,
  isPreviewModalOpen: false,
  isNewsDetailOpen: false,
  isLoading: false,
  error: null,

  setNewsClips: (updater) =>
    set((state) => ({
      newsClips: typeof updater === 'function' ? updater(state.newsClips) : updater,
    })),
  setChainItems: (updater) =>
    set((state) => ({
      chainItems: typeof updater === 'function' ? updater(state.chainItems) : updater,
    })),
  setPipelineConfig: (pipelineConfig) => set({ pipelineConfig }),
  setSelectedClip: (selectedClip) => set({ selectedClip }),
  setSelectedNewsDetail: (selectedNewsDetail) => set({ selectedNewsDetail }),
  setIsNewBroadcastOpen: (isNewBroadcastOpen) => set({ isNewBroadcastOpen }),
  setIsPreviewModalOpen: (isPreviewModalOpen) => set({ isPreviewModalOpen }),
  setIsNewsDetailOpen: (isNewsDetailOpen) => set({ isNewsDetailOpen }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
