// Category - user-defined work categories
export interface Category {
  id: string;
  name: string;          // e.g. "Reading", "Writing", "Cleaning"
  abbreviation: string;  // e.g. "RD", "WR", "CL" (1-3 letters)
  color: string;         // hex color for histogram shading
  isDefault?: boolean;   // true for "Wasted Time" and other defaults
}

// TodoItem - tasks in the to-do list
export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  priority: 1 | 2 | 3;   // 1 = highest, 3 = lowest
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

// TimeEntry - a logged block of work
export interface TimeEntry {
  id: string;
  categoryId: string;
  todoId?: string;         // optional link to a specific task
  title?: string;          // what the user was working on
  description?: string;    // optional details
  startTime: string;       // ISO string
  endTime: string;         // ISO string
  durationMinutes: number;
}

// Chapter - a named period of tracked days with a date range
export interface Chapter {
  id: string;
  name: string;
  startDate: string;     // ISO date string (YYYY-MM-DD)
  endDate: string;       // ISO date string (YYYY-MM-DD)
  color: string;         // color for the timeline line under the histogram
  description?: string;
  tasks?: string[];
  createdAt: string;
}

// Timer state
export type TimerStatus = 'idle' | 'running' | 'paused';
