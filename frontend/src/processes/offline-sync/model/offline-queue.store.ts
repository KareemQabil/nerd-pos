import { create } from 'zustand';

type OfflineOp = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  retryCount: number;
  lastError?: string;
};

type OfflineQueueState = {
  queue: OfflineOp[];
  enqueue: (op: OfflineOp) => void;
  clear: () => void;
};

export const useOfflineQueueStore = create<OfflineQueueState>((set) => ({
  queue: [],
  enqueue: (op) => set((state) => ({ queue: [...state.queue, op] })),
  clear: () => set({ queue: [] }),
}));
