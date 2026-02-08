import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Category } from '@/types';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-wasted', name: 'Wasted Time', abbreviation: 'WT', color: '#6b7280', isDefault: true },
];

interface CategoryStore {
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => string;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;
  getCategoryById: (id: string) => Category | undefined;
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,

      addCategory: (category) => {
        const id = uuidv4();
        set((state) => ({
          categories: [...state.categories, { ...category, id }],
        }));
        return id;
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },

      getCategoryById: (id) => {
        return get().categories.find((c) => c.id === id);
      },
    }),
    { name: 'productivity-categories' }
  )
);
