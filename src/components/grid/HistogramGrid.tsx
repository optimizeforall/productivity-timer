"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TimeEntry, Category, Chapter } from "@/types";
import { today as getToday, shortDayLabel } from "@/lib/dates";
import DayColumn from "./DayColumn";
import { useTimeEntryStore } from "@/stores/useTimeEntryStore";
import { buildDateForLogicalDay, getLogicalDayKey } from "@/lib/dayBoundary";

interface HistogramGridProps {
  dates: string[];
  entries: TimeEntry[];
  categories: Category[];
  chapters: Chapter[];
  hoursPerDay: number;
  dayEndsAtHour: number;
  onAdjustRange?: (direction: "expand" | "contract") => void;
}

export default function HistogramGrid({
  dates,
  entries,
  categories,
  chapters,
  hoursPerDay,
  dayEndsAtHour,
  onAdjustRange,
}: HistogramGridProps) {
  const { addEntry } = useTimeEntryStore();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [useEndTime, setUseEndTime] = useState(false);
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [newDurationHours, setNewDurationHours] = useState(1);
  const todayStr = getToday();

  // Group entries by logical day, respecting "day ends at" setting
  const entriesByDate = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const entry of entries) {
      const date = getLogicalDayKey(entry.startTime, dayEndsAtHour);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(entry);
    }
    return map;
  }, [entries, dayEndsAtHour]);

  // Compute max hours in any single day
  const maxHoursInAnyDay = useMemo(() => {
    let max = 0;
    for (const dayEntries of entriesByDate.values()) {
      const dayMinutes = dayEntries.reduce(
        (sum, e) => sum + e.durationMinutes,
        0,
      );
      max = Math.max(max, dayMinutes / 60);
    }
    return max;
  }, [entriesByDate]);

  const maxHoursDisplay = Math.max(hoursPerDay, Math.ceil(maxHoursInAnyDay));

  // Selected day detail
  const selectedDayDate = selectedDay !== null ? dates[selectedDay] : null;
  const selectedDayEntries = selectedDayDate
    ? (entriesByDate.get(selectedDayDate) ?? [])
    : [];
  const selectedDayEntriesSorted = useMemo(() => {
    return [...selectedDayEntries].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [selectedDayEntries]);

  // Aggregate selected day by category
  const selectedDayBreakdown = useMemo(() => {
    if (!selectedDayEntries.length) return [];
    const map = new Map<string, { minutes: number; entries: TimeEntry[] }>();
    for (const e of selectedDayEntries) {
      const existing = map.get(e.categoryId) ?? { minutes: 0, entries: [] };
      existing.minutes += e.durationMinutes;
      existing.entries.push(e);
      map.set(e.categoryId, existing);
    }
    const totalMinutes = selectedDayEntries.reduce(
      (s, e) => s + e.durationMinutes,
      0,
    );
    return Array.from(map.entries())
      .map(([catId, data]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          category: cat,
          minutes: data.minutes,
          entries: data.entries.sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          ),
          percent: totalMinutes > 0 ? (data.minutes / totalMinutes) * 100 : 0,
        };
      })
      .filter((b) => b.category)
      .sort((a, b) => b.minutes - a.minutes);
  }, [selectedDayEntries, categories]);

  const selectedDayTotalMinutes = selectedDayEntries.reduce(
    (s, e) => s + e.durationMinutes,
    0,
  );

  // Y-axis labels - add padding at top so the top label isn't clipped
  const yLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(maxHoursDisplay / 8));
    const labels: { label: string; position: number }[] = [];
    for (let h = maxHoursDisplay; h >= 0; h -= step) {
      if (h === 0) continue;
      labels.push({
        label: `${h}h`,
        position: ((maxHoursDisplay - h) / maxHoursDisplay) * 100,
      });
    }
    return labels;
  }, [maxHoursDisplay]);

  // Chapter lines
  const chapterLines = useMemo(() => {
    return chapters
      .map((ch) => {
        const startIdx = dates.findIndex((d) => d >= ch.startDate);
        const endIdx = dates.findIndex((d) => d > ch.endDate);
        return {
          chapter: ch,
          startCol: startIdx === -1 ? dates.length : startIdx,
          endCol: endIdx === -1 ? dates.length - 1 : endIdx - 1,
        };
      })
      .filter((cl) => cl.startCol <= cl.endCol && cl.startCol < dates.length);
  }, [chapters, dates]);

  const colCount = dates.length;
  const maxMinsForBar =
    selectedDayTotalMinutes > 0
      ? Math.max(...selectedDayBreakdown.map((b) => b.minutes))
      : 0;

  // Hide labels when there are too many days (threshold: 30)
  const hideLabels = colCount > 30;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0 && mins > 0) {
      return `${hrs}h${mins}m`;
    } else if (hrs > 0) {
      return `${hrs}h`;
    } else {
      return `${mins}m`;
    }
  };

  const getTimePlusHours = (timeStr: string, hours: number) => {
    const [h, m] = timeStr.split(":").map(Number);
    const base = new Date();
    base.setHours(h || 0, m || 0, 0, 0);
    const next = new Date(base.getTime() + hours * 60 * 60000);
    return next.toTimeString().slice(0, 5);
  };

  const resetAddTaskForm = () => {
    setShowAddTask(false);
    setNewTitle("");
    setNewDescription("");
    setNewCategoryId("");
    setNewStartTime("12:00");
    setNewEndTime("13:00");
    setNewDurationHours(1);
    setUseEndTime(false);
  };

  const handleAddTask = () => {
    if (!selectedDayDate || !newCategoryId || !newStartTime) return;
    const [sh, sm] = newStartTime.split(":").map(Number);
    const startMinutes = (sh || 0) * 60 + (sm || 0);
    let durationMinutes = Math.max(1, Math.round(newDurationHours * 60));

    if (useEndTime && newEndTime) {
      const [eh, em] = newEndTime.split(":").map(Number);
      let endMinutes = (eh || 0) * 60 + (em || 0);
      let diff = endMinutes - startMinutes;
      if (diff <= 0) diff += 24 * 60;
      durationMinutes = Math.max(1, diff);
    }

    const startLocal = buildDateForLogicalDay(
      selectedDayDate,
      newStartTime,
      dayEndsAtHour,
    );
    const endLocal = new Date(startLocal.getTime() + durationMinutes * 60000);

    const cat = categories.find((c) => c.id === newCategoryId);
    addEntry({
      categoryId: newCategoryId,
      title: newTitle.trim() || cat?.name || undefined,
      description: newDescription.trim() || undefined,
      startTime: startLocal.toISOString(),
      endTime: endLocal.toISOString(),
      durationMinutes,
    });

    resetAddTaskForm();
  };

  return (
    <>
      {/* Scrollable Grid Section */}
      <div className="space-y-2">
        {/* Grid */}
        <div className="flex">
          {/* Y-axis -- added pt-2 so top label doesn't clip */}
          <div
            className="relative pr-2 text-right shrink-0 w-10 pt-2"
            style={{
              height: `${maxHoursDisplay * 16 + 8}px`,
              minHeight: "88px",
            }}
          >
            {yLabels.map(({ label, position }) => (
              <span
                key={label}
                className="absolute right-2 text-[10px] text-muted leading-none -translate-y-1/2"
                style={{ top: `calc(8px + ${position}%)` }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex flex-1 border-l border-card-border pt-2">
            {dates.map((date, i) => (
              <div
                key={date}
                className="flex-1 border-r border-card-border"
                style={{
                  minWidth:
                    colCount > 30 ? "12px" : colCount > 15 ? "20px" : "28px",
                }}
              >
                <DayColumn
                  dayLabel={shortDayLabel(date)}
                  entries={entriesByDate.get(date) ?? []}
                  categories={categories}
                  hoursPerDay={hoursPerDay}
                  maxHoursDisplay={maxHoursDisplay}
                  isToday={date === todayStr}
                  hideLabels={hideLabels}
                  onClick={() => {
                    setSelectedDay(i);
                    setShowAddTask(false);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Chapter timeline lines */}
        {chapterLines.length > 0 && (
          <div className="ml-10 space-y-1.5">
            {chapterLines.map(({ chapter, startCol, endCol }) => {
              const leftPercent = (startCol / colCount) * 100;
              const widthPercent = ((endCol - startCol + 1) / colCount) * 100;
              return (
                <div key={chapter.id} className="relative h-2">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      height: "3px",
                      backgroundColor: chapter.color,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected day detail - outside scrollable area */}
      {selectedDayDate && (
        <div className="rounded-lg border border-card-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {shortDayLabel(selectedDayDate)}
            </h3>
            <div className="flex items-center gap-3">
              <Link
                href={`/grid/day/${selectedDayDate}`}
                className="text-xs text-muted hover:text-foreground"
              >
                Edit
              </Link>
              <button
                onClick={() => {
                  setSelectedDay(null);
                  resetAddTaskForm();
                }}
                className="text-xs text-muted hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>
          <div>
            {!showAddTask ? (
              <button
                onClick={() => {
                  const defaultTime = "12:00";
                  setNewStartTime(defaultTime);
                  setNewEndTime(getTimePlusHours(defaultTime, 1));
                  setShowAddTask(true);
                }}
                className="text-xs text-accent hover:text-accent/80"
              >
                + Add task to this day
              </button>
            ) : (
              <div
                className="mt-2 rounded-lg border border-card-border bg-card/50 p-3 space-y-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleAddTask();
                  }
                }}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full rounded bg-background px-2 py-1.5 text-xs border border-card-border focus:outline-none focus:border-accent"
                  />
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full rounded bg-background px-2 py-1.5 text-xs border border-card-border focus:outline-none focus:border-accent"
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
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full rounded bg-background px-2 py-1.5 text-xs border border-card-border focus:outline-none focus:border-accent"
                />
                <div className="grid gap-2 sm:grid-cols-3 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-muted">Start</label>
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="rounded bg-background px-2 py-1.5 text-xs border border-card-border focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-muted">
                      {useEndTime ? "End" : "Hours"}
                    </label>
                    {useEndTime ? (
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="rounded bg-background px-2 py-1.5 text-xs border border-card-border focus:outline-none focus:border-accent"
                      />
                    ) : (
                      <input
                        type="number"
                        min={0.25}
                        step={0.25}
                        value={newDurationHours}
                        onChange={(e) =>
                          setNewDurationHours(
                            Math.max(0.25, parseFloat(e.target.value) || 0.25),
                          )
                        }
                        className="w-20 rounded bg-background px-2 py-1.5 text-xs border border-card-border focus:outline-none focus:border-accent"
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-[11px] text-muted">
                    <input
                      type="checkbox"
                      checked={useEndTime}
                      onChange={(e) => setUseEndTime(e.target.checked)}
                    />
                    Use end time
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={resetAddTaskForm}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTask}
                    disabled={!newCategoryId || !newStartTime}
                    className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
          {selectedDayBreakdown.length === 0 ? (
            <p className="text-xs text-muted">No entries for this day.</p>
          ) : (
            <div className="space-y-1">
              {selectedDayBreakdown.map(({ category, minutes, percent }) => {
                const barWidth =
                  maxMinsForBar > 0 ? (minutes / maxMinsForBar) * 100 : 0;
                return (
                  <div key={category!.id}>
                    {/* Category row: square + bar | hours + name */}
                    <div className="flex items-center gap-2 w-full text-left rounded px-1 py-1">
                      <span
                        className="inline-block h-3 w-3 rounded shrink-0"
                        style={{ backgroundColor: category!.color }}
                      />
                      <span className="shrink-0 text-[11px] font-mono text-foreground/60 w-10 text-right">
                        {percent.toFixed(0)}%
                      </span>
                      {/* Bar with clean cutoff */}
                      <div className="flex-1 flex items-center gap-0">
                        <div className="flex-1 h-2 overflow-hidden bg-white/5 rounded-l">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: category!.color,
                            }}
                          />
                        </div>
                        {/* Clean vertical divider line */}
                        <div className="w-px h-3 bg-white/15 shrink-0" />
                      </div>
                      {/* Hours + name after the divider */}
                      <span className="shrink-0 font-mono text-xs text-muted whitespace-nowrap ml-1.5">
                        {(minutes / 60).toFixed(1)}h
                      </span>
                      <span className="shrink-0 text-xs text-foreground/70 whitespace-nowrap">
                        {category!.name}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-card-border mt-2 pt-2">
                {selectedDayEntriesSorted.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedDayEntriesSorted.map((entry) => {
                      const cat = categories.find(
                        (c) => c.id === entry.categoryId,
                      );
                      const title =
                        entry.title &&
                        entry.title.trim() &&
                        entry.title !== "Untitled"
                          ? entry.title.trim()
                          : cat?.name || "Untitled";
                      return (
                        <div
                          key={entry.id}
                          className="text-xs text-foreground/80"
                        >
                          <span className="font-mono text-muted mr-2">
                            {formatTime(entry.startTime)}
                          </span>
                          <span style={{ color: cat?.color ?? "inherit" }}>
                            {title}
                          </span>
                          {entry.description ? (
                            <span className="text-muted">
                              {" "}
                              — {entry.description}
                            </span>
                          ) : null}
                          <span className="text-muted ml-1">
                            ({formatDuration(entry.durationMinutes)})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    No tasks logged for this day.
                  </p>
                )}
              </div>
              {/* Total - with separator line */}
              <div className="border-t border-card-border/50 mt-2 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Total</span>
                  <span className="font-mono text-xs text-foreground">
                    {formatDuration(selectedDayTotalMinutes)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
