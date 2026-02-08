import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Chapter } from '@/types';

const CHAPTER_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#14b8a6', '#f43f5e',
];

interface ChapterStore {
  chapters: Chapter[];
  hoursPerDay: number;
  addChapter: (chapter: { name: string; startDate: string; endDate: string; color?: string; description?: string; tasks?: string[] }) => string;
  updateChapter: (id: string, updates: Partial<Omit<Chapter, 'id' | 'createdAt'>>) => void;
  deleteChapter: (id: string) => void;
  setHoursPerDay: (hours: number) => void;
  getNextColor: () => string;
}

export const useChapterStore = create<ChapterStore>()(
  persist(
    (set, get) => ({
      chapters: [],
      hoursPerDay: 16,

      addChapter: (chapter) => {
        const id = uuidv4();
        set((state) => ({
          chapters: [
            ...state.chapters,
            {
              id,
              name: chapter.name,
              startDate: chapter.startDate,
              endDate: chapter.endDate,
              color: chapter.color ?? get().getNextColor(),
              description: chapter.description,
              tasks: chapter.tasks ?? [],
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },

      updateChapter: (id, updates) => {
        set((state) => ({
          chapters: state.chapters.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteChapter: (id) => {
        set((state) => ({
          chapters: state.chapters.filter((c) => c.id !== id),
        }));
      },

      setHoursPerDay: (hours) => {
        set({ hoursPerDay: hours });
      },

      getNextColor: () => {
        const { chapters } = get();
        return CHAPTER_COLORS[chapters.length % CHAPTER_COLORS.length];
      },
    }),
    { name: 'productivity-chapters' }
  )
);
