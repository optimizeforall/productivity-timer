\'use client\';

import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useTodoStore } from '@/stores/useTodoStore';
import { useTimeEntryStore } from '@/stores/useTimeEntryStore';

type CategoryRow = {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  is_default: boolean | null;
};

type TodoRow = {
  id: string;
  title: string;
  description: string | null;
  category_id: string;
  priority: number;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
};

type TimeEntryRow = {
  id: string;
  category_id: string;
  todo_id: string | null;
  title: string | null;
  description: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
};

const toCategoryRow = (cat: ReturnType<typeof useCategoryStore>['categories'][number]): CategoryRow => ({
  id: cat.id,
  name: cat.name,
  abbreviation: cat.abbreviation,
  color: cat.color,
  is_default: cat.isDefault ?? false,
});

const fromCategoryRow = (row: CategoryRow) => ({
  id: row.id,
  name: row.name,
  abbreviation: row.abbreviation,
  color: row.color,
  isDefault: Boolean(row.is_default),
});

const toTodoRow = (todo: ReturnType<typeof useTodoStore>['todos'][number]): TodoRow => ({
  id: todo.id,
  title: todo.title,
  description: todo.description ?? null,
  category_id: todo.categoryId,
  priority: todo.priority,
  completed: todo.completed,
  created_at: todo.createdAt,
  completed_at: todo.completedAt ?? null,
});

const fromTodoRow = (row: TodoRow) => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  categoryId: row.category_id,
  priority: row.priority as 1 | 2 | 3,
  completed: row.completed,
  createdAt: row.created_at,
  completedAt: row.completed_at ?? undefined,
});

const toEntryRow = (entry: ReturnType<typeof useTimeEntryStore>['entries'][number]): TimeEntryRow => ({
  id: entry.id,
  category_id: entry.categoryId,
  todo_id: entry.todoId ?? null,
  title: entry.title ?? null,
  description: entry.description ?? null,
  start_time: entry.startTime,
  end_time: entry.endTime,
  duration_minutes: entry.durationMinutes,
});

const fromEntryRow = (row: TimeEntryRow) => ({
  id: row.id,
  categoryId: row.category_id,
  todoId: row.todo_id ?? undefined,
  title: row.title ?? undefined,
  description: row.description ?? undefined,
  startTime: row.start_time,
  endTime: row.end_time,
  durationMinutes: row.duration_minutes,
});

async function syncTable<Row extends { id: string }>(
  table: 'categories' | 'todos' | 'time_entries',
  rows: Row[],
) {
  if (!supabase) return;
  const { data: remoteIds } = await supabase.from(table).select('id');
  if (remoteIds) {
    const localIds = new Set(rows.map((r) => r.id));
    const toDelete = remoteIds
      .map((r) => r.id)
      .filter((id) => !localIds.has(id));
    if (toDelete.length > 0) {
      await supabase.from(table).delete().in('id', toDelete);
    }
  }
  if (rows.length > 0) {
    await supabase.from(table).upsert(rows, { onConflict: 'id' });
  }
}

export default function SupabaseBootstrap() {
  const { categories, setCategories } = useCategoryStore();
  const { todos, setTodos } = useTodoStore();
  const { entries, setEntries } = useTimeEntryStore();
  const readyRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;

    const bootstrap = async () => {
      const [catRes, todoRes, entryRes] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('todos').select('*'),
        supabase.from('time_entries').select('*'),
      ]);

      if (cancelled) return;

      if (catRes.data && catRes.data.length > 0) {
        setCategories(catRes.data.map(fromCategoryRow));
      } else if (categories.length > 0) {
        await supabase.from('categories').upsert(categories.map(toCategoryRow), { onConflict: 'id' });
      }

      if (todoRes.data && todoRes.data.length > 0) {
        setTodos(todoRes.data.map(fromTodoRow));
      } else if (todos.length > 0) {
        await supabase.from('todos').upsert(todos.map(toTodoRow), { onConflict: 'id' });
      }

      if (entryRes.data && entryRes.data.length > 0) {
        setEntries(entryRes.data.map(fromEntryRow));
      } else if (entries.length > 0) {
        await supabase.from('time_entries').upsert(entries.map(toEntryRow), { onConflict: 'id' });
      }

      readyRef.current = true;
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!readyRef.current || !isSupabaseConfigured) return;
    void syncTable('categories', categories.map(toCategoryRow));
  }, [categories]);

  useEffect(() => {
    if (!readyRef.current || !isSupabaseConfigured) return;
    void syncTable('todos', todos.map(toTodoRow));
  }, [todos]);

  useEffect(() => {
    if (!readyRef.current || !isSupabaseConfigured) return;
    void syncTable('time_entries', entries.map(toEntryRow));
  }, [entries]);

  return null;
}
