import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { TodoItem } from '@/types';

interface TodoStore {
  todos: TodoItem[];
  setTodos: (todos: TodoItem[]) => void;
  addTodo: (todo: Omit<TodoItem, 'id' | 'completed' | 'createdAt' | 'completedAt'>) => string;
  updateTodo: (id: string, updates: Partial<Omit<TodoItem, 'id' | 'createdAt'>>) => void;
  deleteTodo: (id: string) => void;
  toggleComplete: (id: string) => void;
  getTodoById: (id: string) => TodoItem | undefined;
  getTodosByCategory: (categoryId: string) => TodoItem[];
  getActiveTodos: () => TodoItem[];
}

export const useTodoStore = create<TodoStore>()(
  persist(
    (set, get) => ({
      todos: [],

      setTodos: (todos) => {
        set({ todos });
      },

      addTodo: (todo) => {
        const id = uuidv4();
        const newTodo: TodoItem = {
          ...todo,
          id,
          completed: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ todos: [...state.todos, newTodo] }));
        return id;
      },

      updateTodo: (id, updates) => {
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },

      deleteTodo: (id) => {
        set((state) => ({
          todos: state.todos.filter((t) => t.id !== id),
        }));
      },

      toggleComplete: (id) => {
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: !t.completed,
                  completedAt: !t.completed ? new Date().toISOString() : undefined,
                }
              : t
          ),
        }));
      },

      getTodoById: (id) => {
        return get().todos.find((t) => t.id === id);
      },

      getTodosByCategory: (categoryId) => {
        return get().todos.filter((t) => t.categoryId === categoryId);
      },

      getActiveTodos: () => {
        return get().todos.filter((t) => !t.completed);
      },
    }),
    { name: 'productivity-todos' }
  )
);
