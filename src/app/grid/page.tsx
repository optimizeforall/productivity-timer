"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useChapterStore } from "@/stores/useChapterStore";
import { useTimeEntryStore } from "@/stores/useTimeEntryStore";
import { useCategoryStore } from "@/stores/useCategoryStore";
import { useTodoStore } from "@/stores/useTodoStore";
import HistogramGrid from "@/components/grid/HistogramGrid";
import HydrationGuard from "@/components/shared/HydrationGuard";
import { formatDate, daysBetween, dateRange, today } from "@/lib/dates";
import { getLogicalDayKey } from "@/lib/dayBoundary";

const CHAPTER_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#14b8a6",
  "#f43f5e",
];

function GridContent() {
  const {
    chapters,
    addChapter,
    updateChapter,
    deleteChapter,
    hoursPerDay,
    dayEndsAtHour,
    gridViewStart,
    gridViewEnd,
    setGridViewStart,
    setGridViewEnd,
  } = useChapterStore();
  const { entries } = useTimeEntryStore();
  const { categories } = useCategoryStore();
  const { addTodo } = useTodoStore();

  const defaultTaskCategoryId = useMemo(() => {
    return categories.find((c) => !c.isDefault)?.id ?? categories[0]?.id ?? "";
  }, [categories]);

  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newColor, setNewColor] = useState(CHAPTER_COLORS[0]);
  const [newDescription, setNewDescription] = useState("");
  const [newTaskInput, setNewTaskInput] = useState("");
  const [newTasks, setNewTasks] = useState<string[]>([]);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editColor, setEditColor] = useState(CHAPTER_COLORS[0]);
  const [editTasks, setEditTasks] = useState<string[]>([]);
  const [editTaskInput, setEditTaskInput] = useState("");

  // Saved range (restored when closing a chapter)
  const savedRange = useRef<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });

  // Chapter interaction
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(
    null,
  );

  // Global date range across all chapters
  const globalRange = useMemo(() => {
    if (chapters.length === 0) return null;
    let minDate = chapters[0].startDate;
    let maxDate = chapters[0].endDate;
    for (const ch of chapters) {
      if (ch.startDate < minDate) minDate = ch.startDate;
      if (ch.endDate > maxDate) maxDate = ch.endDate;
    }
    return { start: minDate, end: maxDate };
  }, [chapters]);

  const viewStart = gridViewStart ?? globalRange?.start ?? "";
  const viewEnd = gridViewEnd ?? globalRange?.end ?? "";

  const dates = useMemo(() => {
    if (!viewStart || !viewEnd || viewEnd < viewStart) return [];
    return dateRange(viewStart, viewEnd);
  }, [viewStart, viewEnd]);

  const visibleEntries = useMemo(() => {
    if (!viewStart || !viewEnd) return [];
    return entries.filter((e) => {
      const logicalDay = getLogicalDayKey(e.startTime, dayEndsAtHour);
      return logicalDay >= viewStart && logicalDay <= viewEnd;
    });
  }, [entries, viewStart, viewEnd, dayEndsAtHour]);

  const chapterHours = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of chapters) {
      const startMs = new Date(ch.startDate + "T00:00:00").getTime();
      const endMs = new Date(ch.endDate + "T23:59:59").getTime();
      const chapterEntries = entries.filter((e) => {
        const t = new Date(e.startTime).getTime();
        return t >= startMs && t <= endMs;
      });
      const totalMins = chapterEntries.reduce(
        (sum, e) => sum + e.durationMinutes,
        0,
      );
      map.set(ch.id, totalMins / 60);
    }
    return map;
  }, [chapters, entries]);

  const chapterCategoryBreakdown = useCallback(
    (chapterId: string) => {
      const ch = chapters.find((c) => c.id === chapterId);
      if (!ch) return [];
      const startMs = new Date(ch.startDate + "T00:00:00").getTime();
      const endMs = new Date(ch.endDate + "T23:59:59").getTime();
      const chapterEntries = entries.filter((e) => {
        const t = new Date(e.startTime).getTime();
        return t >= startMs && t <= endMs;
      });
      const totalMins = chapterEntries.reduce(
        (s, e) => s + e.durationMinutes,
        0,
      );
      const map = new Map<string, number>();
      for (const e of chapterEntries) {
        map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.durationMinutes);
      }
      return Array.from(map.entries())
        .map(([catId, mins]) => {
          const cat = categories.find((c) => c.id === catId);
          return {
            category: cat,
            minutes: mins,
            percent: totalMins > 0 ? (mins / totalMins) * 100 : 0,
          };
        })
        .filter((b) => b.category)
        .sort((a, b) => b.minutes - a.minutes);
    },
    [chapters, entries, categories],
  );

  const handleCreateChapter = () => {
    if (!newName.trim() || !newStartDate || !newEndDate) return;
    if (newEndDate < newStartDate) return;
    const taskList = newTasks.filter((t) => t.trim().length > 0);
    addChapter({
      name: newName.trim(),
      startDate: newStartDate,
      endDate: newEndDate,
      color: newColor,
      description: newDescription.trim() || undefined,
      tasks: taskList,
    });
    if (defaultTaskCategoryId) {
      taskList.forEach((task) => {
        addTodo({
          title: task.trim(),
          categoryId: defaultTaskCategoryId,
          priority: 3,
        });
      });
    }
    setShowNewChapter(false);
    setNewName("");
    setNewStartDate("");
    setNewEndDate("");
    setNewColor(CHAPTER_COLORS[(chapters.length + 1) % CHAPTER_COLORS.length]);
    setNewDescription("");
    setNewTaskInput("");
    setNewTasks([]);
  };

  const handleChapterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleCreateChapter();
    }
  };

  // Single-click chapter: expand stats + zoom to its range. Close: revert range.
  const handleChapterClick = (chapterId: string) => {
    if (expandedChapterId === chapterId) {
      // Closing: revert to saved range
      setExpandedChapterId(null);
      setGridViewStart(savedRange.current.start);
      setGridViewEnd(savedRange.current.end);
    } else {
      // Opening: save current range, zoom to chapter
      savedRange.current = { start: gridViewStart, end: gridViewEnd };
      const ch = chapters.find((c) => c.id === chapterId);
      if (ch) {
        setGridViewStart(ch.startDate);
        setGridViewEnd(ch.endDate);
      }
      setExpandedChapterId(chapterId);
    }
  };

  const handleResetView = () => {
    setGridViewStart(null);
    setGridViewEnd(null);
    setExpandedChapterId(null);
  };

  const handleExpandLeft = useCallback(() => {
    if (!viewStart) return;
    const startDate = new Date(viewStart);
    startDate.setDate(startDate.getDate() - 1); // Add 1 day to the left
    const newStart = startDate.toISOString().split("T")[0];
    setGridViewStart(newStart);
    setExpandedChapterId(null);
  }, [viewStart, setGridViewStart]);

  const handleContractLeft = useCallback(() => {
    if (!viewStart || !viewEnd) return;
    const startDate = new Date(viewStart);
    startDate.setDate(startDate.getDate() + 1); // Remove 1 day from the left
    const newStart = startDate.toISOString().split("T")[0];
    if (newStart <= viewEnd) {
      setGridViewStart(newStart);
      setExpandedChapterId(null);
    }
  }, [viewStart, viewEnd, setGridViewStart]);

  const handleExpandRight = useCallback(() => {
    if (!viewEnd) return;
    const endDate = new Date(viewEnd);
    endDate.setDate(endDate.getDate() + 1); // Add 1 day to the right
    const newEnd = endDate.toISOString().split("T")[0];
    setGridViewEnd(newEnd);
    setExpandedChapterId(null);
  }, [viewEnd, setGridViewEnd]);

  const handleContractRight = useCallback(() => {
    if (!viewStart || !viewEnd) return;
    const endDate = new Date(viewEnd);
    endDate.setDate(endDate.getDate() - 1); // Remove 1 day from the right
    const newEnd = endDate.toISOString().split("T")[0];
    if (newEnd >= viewStart) {
      setGridViewEnd(newEnd);
      setExpandedChapterId(null);
    }
  }, [viewStart, viewEnd, setGridViewEnd]);

  const handleDeleteChapter = (chapterId: string) => {
    deleteChapter(chapterId);
    if (expandedChapterId === chapterId) {
      setExpandedChapterId(null);
      setGridViewStart(savedRange.current.start);
      setGridViewEnd(savedRange.current.end);
    }
  };

  const startEditChapter = (chapterId: string) => {
    const ch = chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    setEditingChapterId(chapterId);
    setEditName(ch.name);
    setEditDescription(ch.description ?? "");
    setEditStartDate(ch.startDate);
    setEditEndDate(ch.endDate);
    setEditColor(ch.color);
    setEditTasks(ch.tasks ?? []);
    setEditTaskInput("");
  };

  const cancelEditChapter = () => {
    setEditingChapterId(null);
    setEditName("");
    setEditDescription("");
    setEditStartDate("");
    setEditEndDate("");
    setEditColor(CHAPTER_COLORS[0]);
    setEditTasks([]);
    setEditTaskInput("");
  };

  const saveEditChapter = () => {
    if (!editingChapterId || !editName.trim() || !editStartDate || !editEndDate)
      return;
    if (editEndDate < editStartDate) return;
    const nextTasks = editTasks.filter((t) => t.trim().length > 0);
    const prevTasks =
      chapters.find((c) => c.id === editingChapterId)?.tasks ?? [];
    updateChapter(editingChapterId, {
      name: editName.trim(),
      startDate: editStartDate,
      endDate: editEndDate,
      color: editColor,
      description: editDescription.trim() || undefined,
      tasks: nextTasks,
    });
    if (defaultTaskCategoryId) {
      nextTasks
        .filter((task) => !prevTasks.includes(task))
        .forEach((task) => {
          addTodo({
            title: task.trim(),
            categoryId: defaultTaskCategoryId,
            priority: 3,
          });
        });
    }
    cancelEditChapter();
  };

  const isCustomView = gridViewStart !== null || gridViewEnd !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Grid</h1>
        <button
          onClick={() => setShowNewChapter(!showNewChapter)}
          className="rounded-lg border border-card-border bg-card/40 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-card/60 transition-colors"
        >
          + Chapter
        </button>
      </div>

      {/* New Chapter Form */}
      {showNewChapter && (
        <div
          className="rounded-lg border border-card-border bg-card p-4 space-y-3"
          onKeyDown={handleChapterKeyDown}
        >
          <h3 className="text-sm font-semibold">Create a New Chapter</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Exodus, Sprint 3, Deep Work Week"
                className="w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What is this chapter about?"
                rows={2}
                className="w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent resize-none"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="date-input w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent text-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted">
                  End Date
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  min={newStartDate || undefined}
                  className="date-input w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Color</label>
              <div className="flex gap-1.5">
                {CHAPTER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`h-6 w-6 rounded-full transition-transform ${newColor === c ? "scale-125 ring-2 ring-white" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">
                Chapter Tasks
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  placeholder="Add a task and press Enter"
                  className="flex-1 rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTaskInput.trim()) {
                      e.preventDefault();
                      setNewTasks((prev) => [...prev, newTaskInput.trim()]);
                      setNewTaskInput("");
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (!newTaskInput.trim()) return;
                    setNewTasks((prev) => [...prev, newTaskInput.trim()]);
                    setNewTaskInput("");
                  }}
                  className="rounded-lg bg-white/5 px-3 text-xs text-muted hover:text-foreground"
                >
                  Add
                </button>
              </div>
              {newTasks.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {newTasks.map((task, idx) => (
                    <span
                      key={`${task}-${idx}`}
                      className="inline-flex items-center gap-1 rounded-full border border-card-border px-2 py-1 text-xs text-muted"
                    >
                      {task}
                      <button
                        onClick={() =>
                          setNewTasks((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="text-[10px] text-muted hover:text-foreground"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {newStartDate && newEndDate && newEndDate >= newStartDate && (
              <div className="text-xs text-muted">
                {daysBetween(newStartDate, newEndDate)} days &middot;{" "}
                {formatDate(newStartDate)} &ndash; {formatDate(newEndDate)}
              </div>
            )}
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[10px] text-muted">
                Ctrl+Enter to submit
              </span>
              <button
                onClick={() => setShowNewChapter(false)}
                className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChapter}
                disabled={
                  !newName.trim() ||
                  !newStartDate ||
                  !newEndDate ||
                  newEndDate < newStartDate
                }
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Range Controls */}
      {dates.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] text-muted uppercase tracking-wider">
              From
            </label>
            <input
              type="date"
              value={viewStart}
              onChange={(e) => {
                setGridViewStart(e.target.value);
                setExpandedChapterId(null);
              }}
              className="date-input rounded bg-card px-2 py-1.5 text-sm border border-card-border focus:outline-none focus:border-accent text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-muted uppercase tracking-wider">
              To
            </label>
            <input
              type="date"
              value={viewEnd}
              onChange={(e) => {
                setGridViewEnd(e.target.value);
                setExpandedChapterId(null);
              }}
              min={viewStart || undefined}
              className="date-input rounded bg-card px-2 py-1.5 text-sm border border-card-border focus:outline-none focus:border-accent text-foreground"
            />
          </div>
          <div className="text-xs text-muted self-end pb-1.5">
            {dates.length} days
          </div>
          {isCustomView && (
            <button
              onClick={handleResetView}
              className="rounded px-3 py-1.5 text-xs text-accent hover:text-accent/80 self-end"
            >
              Reset to all
            </button>
          )}
        </div>
      )}

      {/* Histogram Grid */}
      {dates.length > 0 ? (
        <>
          <div className="overflow-x-auto -mx-4 px-4">
            <div
              style={{
                minWidth: `${Math.max(dates.length * (dates.length > 30 ? 14 : dates.length > 15 ? 22 : 32), 280)}px`,
              }}
            >
              <HistogramGrid
                dates={dates}
                entries={visibleEntries}
                categories={categories}
                chapters={chapters}
                hoursPerDay={hoursPerDay}
                dayEndsAtHour={dayEndsAtHour}
                onExpandLeft={handleExpandLeft}
                onContractLeft={handleContractLeft}
                onExpandRight={handleExpandRight}
                onContractRight={handleContractRight}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-card-border bg-card px-8 py-16 text-center">
          <div className="text-5xl opacity-10">&#9632;&#9632;&#9632;</div>
          <h2 className="text-lg font-semibold">No chapters yet</h2>
          <p className="text-sm text-muted max-w-sm">
            Create a new chapter to start tracking your productivity. Pick a
            name and a date range, then watch your progress fill in.
          </p>
          <button
            onClick={() => setShowNewChapter(true)}
            className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/80 transition-colors"
          >
            Create Your First Chapter
          </button>
        </div>
      )}

      {/* Chapters list */}
      {chapters.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Chapters</h2>
          <div className="space-y-2">
            {[...chapters].reverse().map((ch) => {
              const days = daysBetween(ch.startDate, ch.endDate);
              const hours = chapterHours.get(ch.id) ?? 0;
              const isExpanded = expandedChapterId === ch.id;
              const breakdown = isExpanded
                ? chapterCategoryBreakdown(ch.id)
                : [];
              const maxMins =
                breakdown.length > 0
                  ? Math.max(...breakdown.map((b) => b.minutes))
                  : 0;
              return (
                <div key={ch.id}>
                  <div
                    className={`flex items-center gap-3 w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                      isExpanded
                        ? "border-accent/50 bg-accent/5"
                        : "border-card-border bg-card hover:bg-white/[0.03]"
                    }`}
                  >
                    <button
                      onClick={() => handleChapterClick(ch.id)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: ch.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {ch.name}
                        </div>
                        <div className="text-xs text-muted">
                          {days} days &middot; Started{" "}
                          {formatDate(ch.startDate)} &middot;{" "}
                          {Math.round(hours)}hrs
                        </div>
                      </div>
                      <svg
                        className={`h-3 w-3 text-muted shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => startEditChapter(ch.id)}
                      className="text-xs text-muted hover:text-foreground px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteChapter(ch.id)}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded"
                      title="Delete chapter"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Expanded stats */}
                  {isExpanded && (
                    <div className="ml-6 mt-2 mb-1 space-y-1.5 border-l border-card-border pl-3">
                      {editingChapterId === ch.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-xs text-muted">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent"
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="mb-1 block text-xs text-muted">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={editStartDate}
                                onChange={(e) =>
                                  setEditStartDate(e.target.value)
                                }
                                className="date-input w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent text-foreground"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="mb-1 block text-xs text-muted">
                                End Date
                              </label>
                              <input
                                type="date"
                                value={editEndDate}
                                onChange={(e) => setEditEndDate(e.target.value)}
                                min={editStartDate || undefined}
                                className="date-input w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent text-foreground"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-muted">
                              Description
                            </label>
                            <textarea
                              value={editDescription}
                              onChange={(e) =>
                                setEditDescription(e.target.value)
                              }
                              rows={2}
                              className="w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent resize-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-muted">
                              Color
                            </label>
                            <div className="flex gap-1.5">
                              {CHAPTER_COLORS.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => setEditColor(c)}
                                  className={`h-6 w-6 rounded-full transition-transform ${editColor === c ? "scale-125 ring-2 ring-white" : ""}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-muted">
                              Chapter Tasks
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editTaskInput}
                                onChange={(e) =>
                                  setEditTaskInput(e.target.value)
                                }
                                placeholder="Add a task and press Enter"
                                className="flex-1 rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent"
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    editTaskInput.trim()
                                  ) {
                                    e.preventDefault();
                                    setEditTasks((prev) => [
                                      ...prev,
                                      editTaskInput.trim(),
                                    ]);
                                    setEditTaskInput("");
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (!editTaskInput.trim()) return;
                                  setEditTasks((prev) => [
                                    ...prev,
                                    editTaskInput.trim(),
                                  ]);
                                  setEditTaskInput("");
                                }}
                                className="rounded-lg bg-white/5 px-3 text-xs text-muted hover:text-foreground"
                              >
                                Add
                              </button>
                            </div>
                            {editTasks.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {editTasks.map((task, idx) => (
                                  <span
                                    key={`${task}-${idx}`}
                                    className="inline-flex items-center gap-1 rounded-full border border-card-border px-2 py-1 text-xs text-muted"
                                  >
                                    {task}
                                    <button
                                      onClick={() =>
                                        setEditTasks((prev) =>
                                          prev.filter((_, i) => i !== idx),
                                        )
                                      }
                                      className="text-[10px] text-muted hover:text-foreground"
                                    >
                                      &times;
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={cancelEditChapter}
                              className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-foreground"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveEditChapter}
                              disabled={
                                !editName.trim() ||
                                !editStartDate ||
                                !editEndDate ||
                                editEndDate < editStartDate
                              }
                              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {ch.description && (
                            <div className="text-xs text-muted">
                              {ch.description}
                            </div>
                          )}
                          {ch.tasks && ch.tasks.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[10px] uppercase tracking-wider text-muted">
                                Tasks
                              </div>
                              <div className="space-y-1">
                                {ch.tasks.map((task, idx) => (
                                  <div
                                    key={`${task}-${idx}`}
                                    className="text-xs text-foreground/70"
                                  >
                                    • {task}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {breakdown.length === 0 ? (
                        <p className="text-xs text-muted">
                          No entries in this chapter yet.
                        </p>
                      ) : (
                        breakdown.map(({ category, minutes, percent }) => (
                          <div
                            key={category!.id}
                            className="flex items-center gap-2"
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 rounded shrink-0"
                              style={{ backgroundColor: category!.color }}
                            />
                            <span className="shrink-0 text-[11px] font-mono text-foreground/60 w-10 text-right">
                              {percent.toFixed(0)}%
                            </span>
                            <div className="flex-1 flex items-center gap-0">
                              <div className="flex-1 h-1.5 overflow-hidden bg-white/5 rounded-l">
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${maxMins > 0 ? (minutes / maxMins) * 100 : 0}%`,
                                    backgroundColor: category!.color,
                                  }}
                                />
                              </div>
                              <div className="w-px h-2.5 bg-white/15 shrink-0" />
                            </div>
                            <span className="shrink-0 font-mono text-[11px] text-muted ml-1">
                              {(minutes / 60).toFixed(1)}h
                            </span>
                            <span className="shrink-0 text-[11px] text-foreground/70">
                              {category!.name}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GridPage() {
  return (
    <HydrationGuard>
      <GridContent />
    </HydrationGuard>
  );
}
