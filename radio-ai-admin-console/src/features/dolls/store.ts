import { create } from 'zustand';
import { Doll, Channel, ChannelTemplate } from './types';
import { INITIAL_DOLLS, CHANNEL_TEMPLATES } from '../../data/mockData';

interface DollState {
  dolls: Doll[];
  templates: ChannelTemplate[];
  selectedDollId: string | null;
  selectedChannelId: string | null;
  studioDoll: Doll | null;
  studioChannel: Channel | null;
  isDollEditorOpen: boolean;
  editingDoll: Doll | null;
  isAvatarCropperOpen: boolean;
  croppingDoll: Doll | null;
  isLoading: boolean;
  error: string | null;

  setDolls: (dolls: Doll[] | ((prev: Doll[]) => Doll[])) => void;
  setTemplates: (templates: ChannelTemplate[]) => void;
  setSelectedDollId: (id: string | null) => void;
  setSelectedChannelId: (id: string | null) => void;
  setStudioContext: (doll: Doll | null, channel: Channel | null) => void;
  openDollEditor: (doll?: Doll | null) => void;
  closeDollEditor: () => void;
  openAvatarCropper: (doll: Doll) => void;
  closeAvatarCropper: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDollStore = create<DollState>((set) => ({
  dolls: INITIAL_DOLLS,
  templates: CHANNEL_TEMPLATES,
  selectedDollId: null,
  selectedChannelId: null,
  studioDoll: null,
  studioChannel: null,
  isDollEditorOpen: false,
  editingDoll: null,
  isAvatarCropperOpen: false,
  croppingDoll: null,
  isLoading: false,
  error: null,

  setDolls: (updater) =>
    set((state) => ({
      dolls: typeof updater === 'function' ? updater(state.dolls) : updater,
    })),
  setTemplates: (templates) => set({ templates }),
  setSelectedDollId: (id) => set({ selectedDollId: id }),
  setSelectedChannelId: (id) => set({ selectedChannelId: id }),
  setStudioContext: (doll, channel) =>
    set({ studioDoll: doll, studioChannel: channel }),
  openDollEditor: (doll = null) =>
    set({ isDollEditorOpen: true, editingDoll: doll }),
  closeDollEditor: () =>
    set({ isDollEditorOpen: false, editingDoll: null }),
  openAvatarCropper: (doll) =>
    set({ isAvatarCropperOpen: true, croppingDoll: doll }),
  closeAvatarCropper: () =>
    set({ isAvatarCropperOpen: false, croppingDoll: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
