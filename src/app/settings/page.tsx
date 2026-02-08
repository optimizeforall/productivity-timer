'use client';

import { useState } from 'react';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useChapterStore } from '@/stores/useChapterStore';
import CategoryBadge from '@/components/shared/CategoryBadge';
import HydrationGuard from '@/components/shared/HydrationGuard';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
];

function SettingsContent() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategoryStore();
  const { hoursPerDay, setHoursPerDay } = useChapterStore();

  const [newName, setNewName] = useState('');
  const [newAbbr, setNewAbbr] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAbbr, setEditAbbr] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAddCategory = () => {
    if (!newName.trim() || !newAbbr.trim()) return;
    addCategory({
      name: newName.trim(),
      abbreviation: newAbbr.trim().toUpperCase().slice(0, 3),
      color: newColor,
    });
    setNewName('');
    setNewAbbr('');
    setNewColor(PRESET_COLORS[0]);
  };

  const startEdit = (cat: typeof categories[0]) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditAbbr(cat.abbreviation);
    setEditColor(cat.color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim() || !editAbbr.trim()) return;
    updateCategory(editingId, {
      name: editName.trim(),
      abbreviation: editAbbr.trim().toUpperCase().slice(0, 3),
      color: editColor,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Categories Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground/80">Categories</h2>

        {/* Existing Categories */}
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-card-border bg-card px-4 py-3"
            >
              {editingId === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-[120px] rounded bg-background px-2 py-1 text-sm border border-card-border focus:outline-none focus:border-accent"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={editAbbr}
                    onChange={(e) => setEditAbbr(e.target.value.slice(0, 3))}
                    className="w-16 rounded bg-background px-2 py-1 text-sm border border-card-border focus:outline-none focus:border-accent uppercase"
                    placeholder="AB"
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`h-5 w-5 rounded-full transition-transform ${editColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/80"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <CategoryBadge abbreviation={cat.abbreviation} color={cat.color} />
                  <span className="flex-1 text-sm">{cat.name}</span>
                  {cat.isDefault && (
                    <span className="text-xs text-muted">Default</span>
                  )}
                  <button
                    onClick={() => startEdit(cat)}
                    className="rounded px-2 py-1 text-xs text-muted hover:text-foreground transition-colors"
                  >
                    Edit
                  </button>
                  {!cat.isDefault && (
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="rounded px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add New Category */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-card-border bg-card/50 px-4 py-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[120px] rounded bg-background px-2 py-1 text-sm border border-card-border focus:outline-none focus:border-accent"
            placeholder="Category name"
          />
          <input
            type="text"
            value={newAbbr}
            onChange={(e) => setNewAbbr(e.target.value.slice(0, 3))}
            className="w-16 rounded bg-background px-2 py-1 text-sm border border-card-border focus:outline-none focus:border-accent uppercase"
            placeholder="AB"
          />
          <div className="flex flex-wrap gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`h-5 w-5 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={handleAddCategory}
            disabled={!newName.trim() || !newAbbr.trim()}
            className="rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </section>

      {/* Grid Preferences Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground/80">Grid Preferences</h2>
        <div className="rounded-lg border border-card-border bg-card px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-foreground/70">Target hours per day</label>
            <input
              type="number"
              min={1}
              max={24}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
              className="w-20 rounded bg-background px-2 py-1 text-sm text-right border border-card-border focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <HydrationGuard>
      <SettingsContent />
    </HydrationGuard>
  );
}
