import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

interface SyncStatusStore {
  status: SyncStatus;
  setStatus: (status: SyncStatus) => void;
}

export const useSyncStatusStore = create<SyncStatusStore>()((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
