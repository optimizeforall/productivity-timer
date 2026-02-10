import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TimerStatus } from "@/types";

interface TimerStore {
  status: TimerStatus;
  categoryId: string | null;
  todoId: string | null;
  startedAt: string | null; // ISO string - original start time
  lastResumedAt: string | null; // ISO string - when the current running segment began
  accumulatedMs: number; // ms accumulated across completed segments (pauses excluded)
  start: (categoryId: string, todoId?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => {
    categoryId: string;
    todoId: string | null;
    durationMinutes: number;
    startTime: string;
    endTime: string;
  } | null;
  reset: () => void;
  getElapsedMs: () => number;
  addTestHour: () => void;
  updateCategory: (categoryId: string) => void;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      status: "idle",
      categoryId: null,
      todoId: null,
      startedAt: null,
      lastResumedAt: null,
      accumulatedMs: 0,

      start: (categoryId, todoId) => {
        const now = new Date().toISOString();
        set({
          status: "running",
          categoryId,
          todoId: todoId ?? null,
          startedAt: now,
          lastResumedAt: now,
          accumulatedMs: 0,
        });
      },

      pause: () => {
        const { status, lastResumedAt, accumulatedMs } = get();
        if (status !== "running" || !lastResumedAt) return;
        const segmentMs = Date.now() - new Date(lastResumedAt).getTime();
        set({
          status: "paused",
          lastResumedAt: null,
          accumulatedMs: accumulatedMs + segmentMs,
        });
      },

      resume: () => {
        const { status } = get();
        if (status !== "paused") return;
        set({
          status: "running",
          lastResumedAt: new Date().toISOString(),
        });
      },

      stop: () => {
        const state = get();
        if (state.status === "idle" || !state.categoryId || !state.startedAt)
          return null;

        const elapsed = get().getElapsedMs();
        const durationMinutes = Math.round(elapsed / 60000);
        const result = {
          categoryId: state.categoryId,
          todoId: state.todoId,
          durationMinutes,
          startTime: state.startedAt,
          endTime: new Date().toISOString(),
        };

        set({
          status: "idle",
          categoryId: null,
          todoId: null,
          startedAt: null,
          lastResumedAt: null,
          accumulatedMs: 0,
        });

        return result;
      },

      reset: () => {
        set({
          status: "idle",
          categoryId: null,
          todoId: null,
          startedAt: null,
          lastResumedAt: null,
          accumulatedMs: 0,
        });
      },

      getElapsedMs: () => {
        const { status, lastResumedAt, accumulatedMs } = get();
        if (status === "running" && lastResumedAt) {
          const currentSegmentMs =
            Date.now() - new Date(lastResumedAt).getTime();
          return accumulatedMs + currentSegmentMs;
        }
        // paused or idle - just return accumulated
        return accumulatedMs;
      },

      addTestHour: () => {
        set((state) => ({
          accumulatedMs: state.accumulatedMs + 3600000, // add 1 hour in ms
        }));
      },

      updateCategory: (categoryId: string) => {
        const { status } = get();
        if (status !== "idle") {
          set({ categoryId });
        }
      },
    }),
    {
      name: "productivity-timer",
      partialize: (state) => ({
        status: state.status,
        categoryId: state.categoryId,
        todoId: state.todoId,
        startedAt: state.startedAt,
        lastResumedAt: state.lastResumedAt,
        accumulatedMs: state.accumulatedMs,
      }),
    },
  ),
);
