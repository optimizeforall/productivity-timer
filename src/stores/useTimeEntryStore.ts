import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { TimeEntry } from '@/types';

interface TimeEntryStore {
  entries: TimeEntry[];
  addEntry: (entry: Omit<TimeEntry, 'id'>) => string;
  updateEntry: (id: string, updates: Partial<Omit<TimeEntry, 'id'>>) => void;
  deleteEntry: (id: string) => void;
  getEntriesByDate: (date: string) => TimeEntry[];
  getEntriesByDateRange: (startDate: string, endDate: string) => TimeEntry[];
  getEntriesByCategory: (categoryId: string) => TimeEntry[];
}

export const useTimeEntryStore = create<TimeEntryStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => {
        const id = uuidv4();
        set((state) => ({
          entries: [...state.entries, { ...entry, id }],
        }));
        return id;
      },

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }));
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }));
      },

      getEntriesByDate: (date) => {
        return get().entries.filter((e) => {
          const entryDate = new Date(e.startTime).toISOString().split('T')[0];
          return entryDate === date;
        });
      },

      getEntriesByDateRange: (startDate, endDate) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime() + 86400000; // include end day
        return get().entries.filter((e) => {
          const t = new Date(e.startTime).getTime();
          return t >= start && t < end;
        });
      },

      getEntriesByCategory: (categoryId) => {
        return get().entries.filter((e) => e.categoryId === categoryId);
      },
    }),
    { name: 'productivity-time-entries' }
  )
);
