'use client';

import { useState, useMemo } from 'react';
import { useTodoStore } from '@/stores/useTodoStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import TodoItemRow from './TodoItemRow';
import AddTodoForm from './AddTodoForm';

type SortOption = 'priority' | 'category' | 'date';

export default function TodoList() {
  const { todos } = useTodoStore();
  const { categories } = useCategoryStore();
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const activeTodos = useMemo(() => {
    let filtered = todos.filter((t) => !t.completed);
    if (filterCategory !== 'all') {
      filtered = filtered.filter((t) => t.categoryId === filterCategory);
    }
    return filtered.sort((a, b) => {
      if (sortBy === 'priority') return a.priority - b.priority;
      if (sortBy === 'category') return a.categoryId.localeCompare(b.categoryId);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [todos, sortBy, filterCategory]);

  const completedTodos = useMemo(() => {
    let filtered = todos.filter((t) => t.completed);
    if (filterCategory !== 'all') {
      filtered = filtered.filter((t) => t.categoryId === filterCategory);
    }
    return filtered.sort((a, b) => {
      return new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime();
    });
  }, [todos, filterCategory]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded bg-card px-2 py-1 text-xs border border-card-border focus:outline-none focus:border-accent"
          >
            <option value="priority">Priority</option>
            <option value="category">Category</option>
            <option value="date">Date Added</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded bg-card px-2 py-1 text-xs border border-card-border focus:outline-none focus:border-accent"
          >
            <option value="all">All</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.abbreviation} - {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Todos */}
      {activeTodos.length === 0 ? (
        <div className="rounded-lg border border-card-border bg-card/60 px-4 py-8 text-center text-sm text-muted">
          No active tasks. Add one below to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {activeTodos.map((todo) => (
            <TodoItemRow key={todo.id} todo={todo} />
          ))}
        </div>
      )}

      {/* Add new task */}
      <AddTodoForm />

      {/* Completed Todos */}
      {completedTodos.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
          >
            <svg
              className={`h-3 w-3 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Completed ({completedTodos.length})
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {completedTodos.map((todo) => (
                <TodoItemRow key={todo.id} todo={todo} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
