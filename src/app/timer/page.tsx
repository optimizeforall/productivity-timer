"use client";

import { useState, useEffect, useCallback } from "react";
import { useTimerStore } from "@/stores/useTimerStore";
import { useTimeEntryStore } from "@/stores/useTimeEntryStore";
import { useCategoryStore } from "@/stores/useCategoryStore";
import { useTodoStore } from "@/stores/useTodoStore";
import { useQueueStore } from "@/stores/useQueueStore";
import TimerDisplay from "@/components/timer/TimerDisplay";
import TaskSelector from "@/components/timer/TaskSelector";
import HydrationGuard from "@/components/shared/HydrationGuard";

const WASTED_TIME_ID = "cat-wasted";

function TimerContent() {
  const timerStore = useTimerStore();
  const { addEntry } = useTimeEntryStore();
  const { categories } = useCategoryStore();
  const { getTodoById, toggleComplete } = useTodoStore();
  const queueStore = useQueueStore();
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState(
    timerStore.categoryId ?? "",
  );
  const [selectedTodoId, setSelectedTodoId] = useState(timerStore.todoId ?? "");

  // Stop dialog state
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [stopResult, setStopResult] = useState<{
    categoryId: string;
    todoId: string | null;
    durationMinutes: number;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [entryTitle, setEntryTitle] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [isTaskComplete, setIsTaskComplete] = useState(true);

  const [dailyCompletions, setDailyCompletions] = useState<
    { id: string; title: string; completed: boolean; loggedAt: string }[]
  >([]);

  // "Continue to next?" prompt
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [nextTodoId, setNextTodoId] = useState<string | null>(null);

  const isIdle = timerStore.status === "idle";
  const isRunning = timerStore.status === "running";
  const isPaused = timerStore.status === "paused";

  const currentCategory = categories.find(
    (c) => c.id === (isIdle ? selectedCategoryId : timerStore.categoryId),
  );

  const availableCategories = categories.filter((c) => c.id !== WASTED_TIME_ID);

  const todayKey = new Date().toISOString().split("T")[0];

  useEffect(() => {
    try {
      const raw = localStorage.getItem("productivity-completed-today");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        date: string;
        items: typeof dailyCompletions;
      };
      if (parsed.date === todayKey) {
        setDailyCompletions(parsed.items ?? []);
      } else {
        // New day - clear the completions
        setDailyCompletions([]);
        localStorage.removeItem("productivity-completed-today");
      }
    } catch {
      // ignore
    }
  }, [todayKey]);

  // Check for day boundary every minute
  useEffect(() => {
    const checkDayBoundary = () => {
      const currentDayKey = new Date().toISOString().split("T")[0];
      if (currentDayKey !== todayKey) {
        // Day has changed - reload the page to refresh
        window.location.reload();
      }
    };

    const interval = setInterval(checkDayBoundary, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [todayKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "productivity-completed-today",
        JSON.stringify({ date: todayKey, items: dailyCompletions }),
      );
    } catch {
      // ignore
    }
  }, [dailyCompletions, todayKey]);

  // Auto-select first queue item when idle and nothing selected
  useEffect(() => {
    if (isIdle && !selectedTodoId && !showStopDialog && !showNextPrompt) {
      const nextId = queueStore.peekNext();
      if (nextId) {
        const todo = getTodoById(nextId);
        if (todo && !todo.completed) {
          setSelectedTodoId(nextId);
          setSelectedCategoryId(todo.categoryId);
        }
      }
    }
  }, [
    isIdle,
    selectedTodoId,
    showStopDialog,
    showNextPrompt,
    queueStore,
    getTodoById,
  ]);

  // Ensure category stays synced with selected todo while idle
  useEffect(() => {
    if (!isIdle || !selectedTodoId) return;
    const todo = getTodoById(selectedTodoId);
    if (todo) {
      setSelectedCategoryId(todo.categoryId);
    }
  }, [isIdle, selectedTodoId, getTodoById]);

  const handleStart = () => {
    // Allow starting without category - will use "Wasted Time" as fallback
    const categoryToUse = selectedCategoryId || WASTED_TIME_ID;
    timerStore.start(categoryToUse, selectedTodoId || undefined);
  };

  const handlePause = () => timerStore.pause();
  const handleResume = () => timerStore.resume();

  const handleStopClick = () => {
    const result = timerStore.stop();
    if (result) {
      const linkedTodo = result.todoId ? getTodoById(result.todoId) : null;
      setEntryTitle(linkedTodo?.title ?? "");
      setEntryDescription("");
      setIsTaskComplete(true);
      setStopResult(result);
      setShowStopDialog(true);
    }
  };

  const finishLogging = useCallback(
    (
      result: NonNullable<typeof stopResult>,
      title?: string,
      description?: string,
    ) => {
      addEntry({
        categoryId: result.categoryId,
        todoId: result.todoId ?? undefined,
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
        startTime: result.startTime,
        endTime: result.endTime,
        durationMinutes: Math.max(1, result.durationMinutes),
      });

      if (result.todoId) {
        const todo = getTodoById(result.todoId);
        setDailyCompletions((prev) => [
          ...prev,
          {
            id: result.todoId!,
            title: todo?.title ?? title?.trim() ?? "Untitled",
            completed: isTaskComplete,
            loggedAt: new Date().toISOString(),
          },
        ]);
        if (isTaskComplete) {
          toggleComplete(result.todoId);
          if (queueStore.isInQueue(result.todoId)) {
            queueStore.removeFromQueue(result.todoId);
          }
        } else if (queueStore.isInQueue(result.todoId)) {
          // Keep incomplete tasks in the main list by removing them from the queue.
          queueStore.removeFromQueue(result.todoId);
        }
      }

      setShowStopDialog(false);

      // Check if there's a next task in the queue (skip current if it's still queued)
      const queue = queueStore.queue;
      let nextId = queueStore.peekNext();
      if (nextId === result.todoId) {
        nextId = queue.length > 1 ? queue[1] : undefined;
      }
      if (nextId) {
        const nextTodo = getTodoById(nextId);
        if (nextTodo && !nextTodo.completed) {
          setNextTodoId(nextId);
          setShowNextPrompt(true);
          setStopResult(null);
          return;
        }
      }

      // No next task
      setStopResult(null);
      setSelectedCategoryId("");
      setSelectedTodoId("");
    },
    [addEntry, queueStore, getTodoById, isTaskComplete, toggleComplete],
  );

  const handleConfirmLog = () => {
    if (!stopResult) return;
    finishLogging(stopResult, entryTitle, entryDescription);
  };

  const handleContinueNext = () => {
    if (!nextTodoId) return;
    const todo = getTodoById(nextTodoId);
    if (!todo) return;

    // Pop from queue and start timer
    queueStore.popNext();
    setSelectedCategoryId(todo.categoryId);
    setSelectedTodoId(todo.id);
    timerStore.start(todo.categoryId, todo.id);

    setShowNextPrompt(false);
    setNextTodoId(null);
  };

  const handleSkipNext = () => {
    setShowNextPrompt(false);
    setNextTodoId(null);
    setSelectedCategoryId("");
    setSelectedTodoId("");
  };

  // Keyboard: Enter/Space to continue next, Escape to skip
  useEffect(() => {
    if (!showNextPrompt) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleContinueNext();
      } else if (e.key === "Escape") {
        handleSkipNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showNextPrompt, nextTodoId]);

  const handleLogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleConfirmLog();
    }
  };

  const handleAddTestHour = () => timerStore.addTestHour();

  const handleDiscard = () => {
    timerStore.reset();
    setSelectedCategoryId("");
    setSelectedTodoId("");
  };

  // Get next task info for the prompt
  const nextTodo = nextTodoId ? getTodoById(nextTodoId) : null;
  const nextCategory = nextTodo
    ? categories.find((c) => c.id === nextTodo.categoryId)
    : null;

  return (
    <div className="flex flex-col items-center gap-8 pt-8">
      {/* Active or selected category indicator */}
      {currentCategory && (
        <div className="relative">
          <button
            onClick={() =>
              !isIdle && setShowCategorySelector(!showCategorySelector)
            }
            className={`rounded-full px-4 py-1 text-sm font-medium transition-all ${
              !isIdle ? "cursor-pointer hover:opacity-80" : ""
            }`}
            style={{
              backgroundColor: currentCategory.color + "20",
              color: currentCategory.color,
            }}
          >
            {currentCategory.name}
          </button>

          {/* Category dropdown when running */}
          {showCategorySelector && !isIdle && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 rounded-lg border border-card-border bg-card shadow-lg p-2 z-50 min-w-[200px]">
              <div className="space-y-1">
                {availableCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      timerStore.updateCategory(cat.id);
                      setShowCategorySelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      timerStore.categoryId === cat.id
                        ? "bg-card-border text-foreground"
                        : "hover:bg-card-border/50 text-muted"
                    }`}
                    style={{
                      color:
                        timerStore.categoryId === cat.id
                          ? cat.color
                          : undefined,
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timer display */}
      <TimerDisplay />

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-3">
        {isIdle && !showStopDialog && !showNextPrompt && (
          <button
            onClick={handleStart}
            className="rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent/80 transition-colors"
          >
            Start
          </button>
        )}
        {isRunning && (
          <>
            <button
              onClick={handlePause}
              className="rounded-xl border border-card-border bg-card/60 px-6 py-3 text-sm font-semibold text-foreground/80 hover:bg-card/80 transition-colors"
            >
              Pause
            </button>
            <button
              onClick={handleStopClick}
              className="rounded-xl border border-card-border bg-card/60 px-6 py-3 text-sm font-semibold text-red-300 hover:bg-card/80 transition-colors"
            >
              Stop & Log
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button
              onClick={handleResume}
              className="rounded-xl border border-card-border bg-card/60 px-6 py-3 text-sm font-semibold text-foreground/80 hover:bg-card/80 transition-colors"
            >
              Resume
            </button>
            <button
              onClick={handleStopClick}
              className="rounded-xl border border-card-border bg-card/60 px-6 py-3 text-sm font-semibold text-red-300 hover:bg-card/80 transition-colors"
            >
              Stop & Log
            </button>
            <button
              onClick={handleDiscard}
              className="rounded-xl border border-card-border bg-card/50 px-6 py-3 text-sm font-semibold text-muted hover:text-foreground hover:bg-card/70 transition-colors"
            >
              Discard
            </button>
          </>
        )}
      </div>

      {/* Test: +1 hour button */}
      {!isIdle && (
        <button
          onClick={handleAddTestHour}
          className="rounded-lg border border-dashed border-card-border px-4 py-2 text-xs text-muted hover:text-foreground hover:border-accent/50 transition-colors"
        >
          +1hr (test)
        </button>
      )}

      {/* Stop dialog */}
      {showStopDialog && stopResult && (
        <div
          className="w-full max-w-md rounded-lg border border-card-border bg-card p-4 space-y-3"
          onKeyDown={handleLogKeyDown}
        >
          <h3 className="text-sm font-semibold">Log your work</h3>
          <p className="text-xs text-muted">
            {Math.max(1, stopResult.durationMinutes)} min logged to{" "}
            {categories.find((c) => c.id === stopResult.categoryId)?.name ??
              "Unknown"}
          </p>
          {stopResult.todoId && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsTaskComplete(true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  isTaskComplete
                    ? "border-green-400/50 bg-green-500/15 text-green-300"
                    : "border-card-border text-muted hover:text-foreground"
                }`}
              >
                Complete Task
              </button>
              <button
                onClick={() => setIsTaskComplete(false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  !isTaskComplete
                    ? "border-purple-400/50 bg-purple-500/15 text-purple-300"
                    : "border-card-border text-muted hover:text-foreground"
                }`}
              >
                Uncompleted Task
              </button>
            </div>
          )}
          <input
            type="text"
            value={entryTitle}
            onChange={(e) => setEntryTitle(e.target.value)}
            placeholder="What did you work on? (title)"
            autoFocus
            className="w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent"
          />
          <textarea
            value={entryDescription}
            onChange={(e) => setEntryDescription(e.target.value)}
            placeholder="Any details? (optional)"
            rows={2}
            className="w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent resize-none"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleConfirmLog}
              className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/80"
            >
              Log
            </button>
          </div>
        </div>
      )}

      {/* "Continue to next?" prompt */}
      {showNextPrompt && nextTodo && (
        <div className="w-full max-w-md rounded-lg border border-accent/30 bg-accent/5 p-5 space-y-4 text-center">
          <h3 className="text-sm font-semibold">Continue to next task?</h3>
          <div className="flex items-center justify-center gap-2">
            {nextCategory && (
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: nextCategory.color }}
              />
            )}
            <span className="text-sm font-medium">{nextTodo.title}</span>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleSkipNext}
              className="rounded-xl border border-card-border bg-card/50 px-6 py-3 text-sm font-semibold text-muted hover:text-foreground hover:bg-card/70 transition-colors"
            >
              Not now
            </button>
            <button
              onClick={handleContinueNext}
              className="rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent/80 transition-colors"
            >
              Start
            </button>
          </div>
          <p className="text-[10px] text-muted">
            Press Enter or Space to start &middot; Esc to skip
          </p>
        </div>
      )}

      {/* Task layout: three sections with vertical separators */}
      {!showStopDialog && !showNextPrompt && (
        <div className="w-full max-w-6xl">
          <TaskSelector
            selectedCategoryId={
              isIdle ? selectedCategoryId : (timerStore.categoryId ?? "")
            }
            selectedTodoId={isIdle ? selectedTodoId : (timerStore.todoId ?? "")}
            onCategoryChange={setSelectedCategoryId}
            onTodoChange={setSelectedTodoId}
            disabled={!isIdle}
          >
            <div className="px-4 min-h-0">
              <div className="mb-2 block text-xs text-muted uppercase tracking-wider">
                Completed for the day
              </div>
              <div className="rounded-lg border border-card-border bg-card/60 p-2 max-h-[320px] overflow-y-auto">
                {dailyCompletions.length === 0 ? (
                  <div className="text-xs text-muted text-center py-6">
                    No completed tasks yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dailyCompletions.map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className={`text-xs line-through ${item.completed ? "text-green-400" : "text-yellow-400"}`}
                      >
                        {item.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TaskSelector>
        </div>
      )}
    </div>
  );
}

export default function TimerPage() {
  return (
    <HydrationGuard>
      <TimerContent />
    </HydrationGuard>
  );
}
