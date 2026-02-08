'use client';

import { useState } from 'react';
import { useTodoStore } from '@/stores/useTodoStore';
import { useCategoryStore } from '@/stores/useCategoryStore';

const WASTED_TIME_ID = 'cat-wasted';
const CREATE_NEW_VALUE = '__create_new__';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
];

export default function AddTodoForm() {
  const { addTodo } = useTodoStore();
  const { categories, addCategory } = useCategoryStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [isOpen, setIsOpen] = useState(false);

  // Inline new category creation
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatAbbr, setNewCatAbbr] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  // Filter out "Wasted Time" from new todo creation
  const availableCategories = categories.filter((c) => c.id !== WASTED_TIME_ID);

  const handleCategoryChange = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
      setCreatingCategory(true);
      setCategoryId('');
    } else {
      setCategoryId(value);
      setCreatingCategory(false);
    }
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim() || !newCatAbbr.trim()) return;
    const id = addCategory({
      name: newCatName.trim(),
      abbreviation: newCatAbbr.trim().toUpperCase().slice(0, 3),
      color: newCatColor,
    });
    setCategoryId(id);
    setCreatingCategory(false);
    setNewCatName('');
    setNewCatAbbr('');
    setNewCatColor(PRESET_COLORS[0]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (title.trim() && categoryId) {
        handleDoSubmit();
      }
    }
  };

  const handleDoSubmit = () => {
    if (!title.trim() || !categoryId) return;
    addTodo({
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      priority,
    });
    setTitle('');
    setDescription('');
    setCategoryId('');
    setPriority(2);
    setIsOpen(false);
    setCreatingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId) return;
    addTodo({
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      priority,
    });
    setTitle('');
    setDescription('');
    setCategoryId('');
    setPriority(2);
    setIsOpen(false);
    setCreatingCategory(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg border border-dashed border-card-border bg-card/50 px-4 py-3 text-sm text-muted hover:text-foreground hover:border-accent/50 transition-colors"
      >
        + Add new task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="rounded-lg border border-card-border bg-card p-4 space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        autoFocus
        className="w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent"
      />
      <div className="flex gap-3">
        <select
          value={creatingCategory ? CREATE_NEW_VALUE : categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="flex-1 rounded bg-background px-3 py-2 text-sm border border-card-border focus:outline-none focus:border-accent"
        >
          <option value="">Select category</option>
          {availableCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.abbreviation} - {cat.name}
            </option>
          ))}
          <option value={CREATE_NEW_VALUE}>+ Create new category</option>
        </select>
        <div className="flex items-center gap-1">
          {([1, 2, 3] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`h-8 w-8 rounded text-xs font-bold transition-colors ${
                priority === p
                  ? p === 1
                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                    : p === 2
                    ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50'
                    : 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                  : 'bg-white/5 text-muted hover:text-foreground'
              }`}
            >
              P{p}
            </button>
          ))}
        </div>
      </div>

      {/* Inline new category creation */}
      {creatingCategory && (
        <div className="rounded-lg border border-dashed border-accent/30 bg-accent/5 p-3 space-y-2">
          <div className="text-xs font-medium text-accent">New Category</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Name"
              className="flex-1 rounded bg-background px-2 py-1.5 text-sm border border-card-border focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              value={newCatAbbr}
              onChange={(e) => setNewCatAbbr(e.target.value.slice(0, 3))}
              placeholder="AB"
              className="w-16 rounded bg-background px-2 py-1.5 text-sm border border-card-border focus:outline-none focus:border-accent uppercase"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewCatColor(c)}
                  className={`h-5 w-5 rounded-full transition-transform ${newCatColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={!newCatName.trim() || !newCatAbbr.trim()}
              className="ml-auto rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/80 disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => { setIsOpen(false); setCreatingCategory(false); }}
          className="rounded px-3 py-1.5 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || !categoryId}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add Task
        </button>
      </div>
    </form>
  );
}
