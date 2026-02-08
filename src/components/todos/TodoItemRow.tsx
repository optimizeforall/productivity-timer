'use client';

import { useState } from 'react';
import type { TodoItem } from '@/types';
import { useTodoStore } from '@/stores/useTodoStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import CategoryBadge from '@/components/shared/CategoryBadge';

interface TodoItemRowProps {
  todo: TodoItem;
}

const PRIORITY_STYLES: Record<number, string> = {
  1: 'text-red-400',
  2: 'text-yellow-400',
  3: 'text-blue-400',
};

export default function TodoItemRow({ todo }: TodoItemRowProps) {
  const { toggleComplete, updateTodo, deleteTodo } = useTodoStore();
  const { categories } = useCategoryStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editPriority, setEditPriority] = useState(todo.priority);
  const [editCategoryId, setEditCategoryId] = useState(todo.categoryId);

  const category = categories.find((c) => c.id === todo.categoryId);

  const handleSave = () => {
    if (!editTitle.trim()) return;
    updateTodo(todo.id, {
      title: editTitle.trim(),
      priority: editPriority,
      categoryId: editCategoryId,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-card-border bg-card px-4 py-3">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="flex-1 rounded bg-background px-2 py-1 text-sm border border-card-border focus:outline-none focus:border-accent"
          autoFocus
        />
        <select
          value={editCategoryId}
          onChange={(e) => setEditCategoryId(e.target.value)}
          className="rounded bg-background px-2 py-1 text-sm border border-card-border"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.abbreviation}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {([1, 2, 3] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setEditPriority(p)}
              className={`h-7 w-7 rounded text-xs font-bold ${
                editPriority === p ? PRIORITY_STYLES[p] + ' bg-white/10' : 'text-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button onClick={handleSave} className="text-xs text-accent hover:text-accent/80">Save</button>
        <button onClick={() => setIsEditing(false)} className="text-xs text-muted hover:text-foreground">Cancel</button>
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-3 rounded-lg border border-card-border bg-card/60 px-4 py-3 transition-colors hover:bg-card/80 ${todo.completed ? 'opacity-50' : ''}`}>
      <button
        onClick={() => toggleComplete(todo.id)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
          todo.completed
            ? 'border-accent bg-accent text-white'
            : 'border-card-border hover:border-accent/60'
        }`}
      >
        {todo.completed && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <span className={`text-sm ${todo.completed ? 'line-through text-muted' : ''}`}>
          {todo.title}
        </span>
      </div>

      {category && (
        <CategoryBadge abbreviation={category.abbreviation} color={category.color} size="sm" />
      )}

      <span className={`text-xs font-bold ${PRIORITY_STYLES[todo.priority]}`}>
        P{todo.priority}
      </span>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="rounded px-1.5 py-0.5 text-xs text-muted hover:text-foreground"
        >
          Edit
        </button>
        <button
          onClick={() => deleteTodo(todo.id)}
          className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:text-red-300"
        >
          Del
        </button>
      </div>
    </div>
  );
}
