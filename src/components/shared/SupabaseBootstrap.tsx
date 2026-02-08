'use client';

import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useTodoStore } from '@/stores/useTodoStore';
import { useTimeEntryStore } from '@/stores/useTimeEntryStore';
import { useChapterStore } from '@/stores/useChapterStore';
import { useSyncStatusStore } from '@/stores/useSyncStatusStore';
import type { Category, TodoItem, TimeEntry, Chapter } from '@/types';

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

type ChapterRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  color: string;
  description: string | null;
  tasks: string[] | null;
  created_at: string;
};

type SettingRow = {
  key: string;
  value: number;
};

const toCategoryRow = (cat: Category): CategoryRow => ({
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

const toTodoRow = (todo: TodoItem): TodoRow => ({
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

const toEntryRow = (entry: TimeEntry): TimeEntryRow => ({
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

const toChapterRow = (chapter: Chapter): ChapterRow => ({
  id: chapter.id,
  name: chapter.name,
  start_date: chapter.startDate,
  end_date: chapter.endDate,
  color: chapter.color,
  description: chapter.description ?? null,
  tasks: chapter.tasks ?? [],
  created_at: chapter.createdAt,
});

const fromChapterRow = (row: ChapterRow): Chapter => ({
  id: row.id,
  name: row.name,
  startDate: row.start_date,
  endDate: row.end_date,
  color: row.color,
  description: row.description ?? undefined,
  tasks: row.tasks ?? [],
  createdAt: row.created_at,
});

async function syncTable<Row extends { id: string }>(
  table: 'categories' | 'todos' | 'time_entries' | 'chapters',
  rows: Row[],
) {
  if (!supabase) return false;
  let ok = true;
  const { data: remoteIds, error: fetchError } = await supabase.from(table).select('id');
  if (fetchError) {
    ok = false;
    console.error(`[Supabase] Failed to fetch ${table} ids`, fetchError);
  } else if (remoteIds) {
    const localIds = new Set(rows.map((r) => r.id));
    const toDelete = remoteIds
      .map((r) => r.id)
      .filter((id) => !localIds.has(id));
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase.from(table).delete().in('id', toDelete);
      if (deleteError) {
        ok = false;
        console.error(`[Supabase] Failed to delete ${table} rows`, deleteError);
      }
    }
  }
  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (upsertError) {
      ok = false;
      console.error(`[Supabase] Failed to upsert ${table}`, upsertError);
    }
  }
  return ok;
}

export default function SupabaseBootstrap() {
  const { categories, setCategories } = useCategoryStore();
  const { todos, setTodos } = useTodoStore();
  const { entries, setEntries } = useTimeEntryStore();
  const { chapters, setChapters, hoursPerDay, setHoursPerDay } = useChapterStore();
  const { setStatus } = useSyncStatusStore();
  const readyRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;

    const bootstrap = async () => {
      if (!supabase) return;
      setStatus('syncing');
      const [catRes, todoRes, entryRes, chapterRes, settingsRes] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('todos').select('*'),
        supabase.from('time_entries').select('*'),
        supabase.from('chapters').select('*'),
        supabase.from('app_settings').select('*').in('key', ['hours_per_day']),
      ]);

      const hadSelectError = Boolean(
        catRes.error || todoRes.error || entryRes.error || chapterRes.error || settingsRes.error
      );
      if (catRes.error) console.error('[Supabase] categories select error', catRes.error);
      if (todoRes.error) console.error('[Supabase] todos select error', todoRes.error);
      if (entryRes.error) console.error('[Supabase] time_entries select error', entryRes.error);
      if (chapterRes.error) console.error('[Supabase] chapters select error', chapterRes.error);
      if (settingsRes.error) console.error('[Supabase] app_settings select error', settingsRes.error);

      if (cancelled) return;

      if (catRes.data && catRes.data.length > 0) {
        setCategories(catRes.data.map(fromCategoryRow));
      } else if (categories.length > 0) {
        const { error } = await supabase.from('categories').upsert(categories.map(toCategoryRow), { onConflict: 'id' });
        if (error) console.error('[Supabase] categories upsert error', error);
      }

      if (todoRes.data && todoRes.data.length > 0) {
        setTodos(todoRes.data.map(fromTodoRow));
      } else if (todos.length > 0) {
        const { error } = await supabase.from('todos').upsert(todos.map(toTodoRow), { onConflict: 'id' });
        if (error) console.error('[Supabase] todos upsert error', error);
      }

      if (entryRes.data && entryRes.data.length > 0) {
        setEntries(entryRes.data.map(fromEntryRow));
      } else if (entries.length > 0) {
        const { error } = await supabase.from('time_entries').upsert(entries.map(toEntryRow), { onConflict: 'id' });
        if (error) console.error('[Supabase] time_entries upsert error', error);
      }

      if (chapterRes.data && chapterRes.data.length > 0) {
        setChapters(chapterRes.data.map(fromChapterRow));
      } else if (chapters.length > 0) {
        const { error } = await supabase.from('chapters').upsert(chapters.map(toChapterRow), { onConflict: 'id' });
        if (error) console.error('[Supabase] chapters upsert error', error);
      }

      if (settingsRes.data && settingsRes.data.length > 0) {
        const hoursSetting = settingsRes.data.find((s) => s.key === 'hours_per_day');
        if (hoursSetting) setHoursPerDay(Number(hoursSetting.value));
      } else if (Number.isFinite(hoursPerDay)) {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: 'hours_per_day', value: hoursPerDay }, { onConflict: 'key' });
        if (error) console.error('[Supabase] app_settings upsert error', error);
      }

      setStatus(hadSelectError ? 'error' : 'saved');
      readyRef.current = true;
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!readyRef.current || !isSupabaseConfigured) return;
    let cancelled = false;
    const run = async () => {
      setStatus('syncing');
      const ok = await syncTable('categories', categories.map(toCategoryRow));
      if (!cancelled) setStatus(ok ? 'saved' : 'error');
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [categories]);

  useEffect(() => {
    if (!readyRef.current || !isSupabaseConfigured) return;
    let cancelled = false;
    const run = async () => {
      setStatus('syncing');
      const ok = await syncTable('todos', todos.map(toTodoRow));
      if (!cancelled) setStatus(ok ? 'saved' : 'error');
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [todos]);

  useEffect(() => {
    if (!readyRef.current || !isSupabaseConfigured) return;
    let cancelled = false;
    const run = async () => {
      setStatus('syncing');
      const ok = await syncTable('time_entries', entries.map(toEntryRow));
      if (!cancelled) setStatus(ok ? 'saved' : 'error');
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [entries]);

  useEffect(() => {
    if (!readyRef.current || !isSupabaseConfigured) return;
    let cancelled = false;
    const run = async () => {
      setStatus('syncing');
      const ok = await syncTable('chapters', chapters.map(toChapterRow));
      if (!cancelled) setStatus(ok ? 'saved' : 'error');
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [chapters]);

  useEffect(() => {
    if (!readyRef.current || !isSupabaseConfigured) return;
    if (!supabase) return;
    let cancelled = false;
    const run = async () => {
      setStatus('syncing');
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'hours_per_day', value: hoursPerDay }, { onConflict: 'key' });
      if (error) {
        console.error('[Supabase] app_settings upsert error', error);
      }
      if (!cancelled) setStatus(error ? 'error' : 'saved');
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [hoursPerDay]);

  return null;
}
