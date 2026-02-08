import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QueueStore {
  /** Ordered array of todo IDs -- index 0 is "up next" */
  queue: string[];
  addToQueue: (todoId: string) => void;
  removeFromQueue: (todoId: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  /** Move an item to a specific position (used by drag-and-drop) */
  insertAt: (todoId: string, index: number) => void;
  peekNext: () => string | undefined;
  popNext: () => string | undefined;
  isInQueue: (todoId: string) => boolean;
  clearQueue: () => void;
}

export const useQueueStore = create<QueueStore>()(
  persist(
    (set, get) => ({
      queue: [],

      addToQueue: (todoId) => {
        set((state) => {
          if (state.queue.includes(todoId)) return state;
          return { queue: [...state.queue, todoId] };
        });
      },

      removeFromQueue: (todoId) => {
        set((state) => ({
          queue: state.queue.filter((id) => id !== todoId),
        }));
      },

      reorder: (fromIndex, toIndex) => {
        set((state) => {
          const q = [...state.queue];
          const [item] = q.splice(fromIndex, 1);
          q.splice(toIndex, 0, item);
          return { queue: q };
        });
      },

      insertAt: (todoId, index) => {
        set((state) => {
          const q = state.queue.filter((id) => id !== todoId);
          q.splice(index, 0, todoId);
          return { queue: q };
        });
      },

      peekNext: () => {
        return get().queue[0];
      },

      popNext: () => {
        const { queue } = get();
        if (queue.length === 0) return undefined;
        const next = queue[0];
        set({ queue: queue.slice(1) });
        return next;
      },

      isInQueue: (todoId) => {
        return get().queue.includes(todoId);
      },

      clearQueue: () => {
        set({ queue: [] });
      },
    }),
    { name: 'productivity-queue' }
  )
);
