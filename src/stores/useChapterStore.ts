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
  dayEndsAtHour: number;
  gridViewStart: string | null;
  gridViewEnd: string | null;
  setChapters: (chapters: Chapter[]) => void;
  addChapter: (chapter: { name: string; startDate: string; endDate: string; color?: string; description?: string; tasks?: string[] }) => string;
  updateChapter: (id: string, updates: Partial<Omit<Chapter, 'id' | 'createdAt'>>) => void;
  deleteChapter: (id: string) => void;
  setHoursPerDay: (hours: number) => void;
  setDayEndsAtHour: (hour: number) => void;
  setGridViewStart: (date: string | null) => void;
  setGridViewEnd: (date: string | null) => void;
  getNextColor: () => string;
}

export const useChapterStore = create<ChapterStore>()(
  persist(
    (set, get) => ({
      chapters: [],
      hoursPerDay: 16,
      dayEndsAtHour: 0,
      gridViewStart: null,
      gridViewEnd: null,

      setChapters: (chapters) => {
        set({ chapters });
      },

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

      setDayEndsAtHour: (hour) => {
        set({ dayEndsAtHour: Math.max(0, Math.min(8, Math.round(hour))) });
      },

      setGridViewStart: (date) => {
        set({ gridViewStart: date });
      },

      setGridViewEnd: (date) => {
        set({ gridViewEnd: date });
      },

      getNextColor: () => {
        const { chapters } = get();
        return CHAPTER_COLORS[chapters.length % CHAPTER_COLORS.length];
      },
    }),
    { name: 'productivity-chapters' }
  )
);
