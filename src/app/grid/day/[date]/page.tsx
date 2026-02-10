'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import HydrationGuard from '@/components/shared/HydrationGuard';
import { useTimeEntryStore } from '@/stores/useTimeEntryStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useChapterStore } from '@/stores/useChapterStore';
import { buildDateForLogicalDay, getLogicalDayKey } from '@/lib/dayBoundary';

type EntryDraft = {
  title: string;
  description: string;
  categoryId: string;
  startTime: string;
  endTime: string;
};

function toTimeInput(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function DayEditorContent({ date }: { date: string }) {
  const { entries, updateEntry, deleteEntry } = useTimeEntryStore();
  const { categories } = useCategoryStore();
  const { dayEndsAtHour } = useChapterStore();
  const [drafts, setDrafts] = useState<Record<string, EntryDraft>>({});

  const dayEntries = useMemo(() => {
    return entries
      .filter((entry) => getLogicalDayKey(entry.startTime, dayEndsAtHour) === date)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [entries, dayEndsAtHour, date]);

  useEffect(() => {
    const next: Record<string, EntryDraft> = {};
    dayEntries.forEach((entry) => {
      next[entry.id] = {
        title: entry.title ?? '',
        description: entry.description ?? '',
        categoryId: entry.categoryId,
        startTime: toTimeInput(entry.startTime),
        endTime: toTimeInput(entry.endTime),
      };
    });
    setDrafts(next);
  }, [dayEntries]);

  const updateDraft = (entryId: string, patch: Partial<EntryDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        ...patch,
      },
    }));
  };

  const saveEntry = (entryId: string) => {
    const draft = drafts[entryId];
    if (!draft || !draft.categoryId || !draft.startTime || !draft.endTime) return;
    const start = buildDateForLogicalDay(date, draft.startTime, dayEndsAtHour);
    let end = buildDateForLogicalDay(date, draft.endTime, dayEndsAtHour);
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    updateEntry(entryId, {
      title: draft.title.trim() || undefined,
      description: draft.description.trim() || undefined,
      categoryId: draft.categoryId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationMinutes,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Day &middot; {date}</h1>
        <Link href="/grid" className="text-sm text-muted hover:text-foreground">
          Back to Grid
        </Link>
      </div>

      {dayEntries.length === 0 ? (
        <div className="rounded-lg border border-card-border bg-card p-4 text-sm text-muted">
          No tasks found for this day.
        </div>
      ) : (
        <div className="space-y-3">
          {dayEntries.map((entry) => {
            const draft = drafts[entry.id];
            if (!draft) return null;
            return (
              <div key={entry.id} className="rounded-lg border border-card-border bg-card p-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => updateDraft(entry.id, { title: e.target.value })}
                    placeholder="Task name"
                    className="w-full rounded bg-background px-2 py-1.5 text-sm border border-card-border focus:outline-none focus:border-accent"
                  />
                  <select
                    value={draft.categoryId}
                    onChange={(e) => updateDraft(entry.id, { categoryId: e.target.value })}
                    className="w-full rounded bg-background px-2 py-1.5 text-sm border border-card-border focus:outline-none focus:border-accent"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.abbreviation} - {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={draft.description}
                  onChange={(e) => updateDraft(entry.id, { description: e.target.value })}
                  placeholder="Description"
                  className="w-full rounded bg-background px-2 py-1.5 text-sm border border-card-border focus:outline-none focus:border-accent"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted">Start</label>
                    <input
                      type="time"
                      value={draft.startTime}
                      onChange={(e) => updateDraft(entry.id, { startTime: e.target.value })}
                      className="rounded bg-background px-2 py-1.5 text-sm border border-card-border focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted">Finish</label>
                    <input
                      type="time"
                      value={draft.endTime}
                      onChange={(e) => updateDraft(entry.id, { endTime: e.target.value })}
                      className="rounded bg-background px-2 py-1.5 text-sm border border-card-border focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="rounded px-3 py-1.5 text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => saveEntry(entry.id)}
                    disabled={!draft.categoryId || !draft.startTime || !draft.endTime}
                    className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DayEditorPage() {
  const params = useParams<{ date: string }>();
  const date = params?.date ?? '';
  return (
    <HydrationGuard>
      <DayEditorContent date={date} />
    </HydrationGuard>
  );
}
