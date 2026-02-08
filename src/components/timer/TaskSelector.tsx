'use client';

import { useState, useRef, useCallback } from 'react';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useTodoStore } from '@/stores/useTodoStore';
import { useQueueStore } from '@/stores/useQueueStore';
import CategoryBadge from '@/components/shared/CategoryBadge';

const WASTED_TIME_ID = 'cat-wasted';

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'P1', color: '#f87171' },
  2: { label: 'P2', color: '#facc15' },
  3: { label: 'P3', color: '#60a5fa' },
};

interface TaskSelectorProps {
  selectedCategoryId: string;
  selectedTodoId: string;
  onCategoryChange: (id: string) => void;
  onTodoChange: (id: string) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export default function TaskSelector({
  selectedCategoryId,
  selectedTodoId,
  onCategoryChange,
  onTodoChange,
  disabled,
  children,
}: TaskSelectorProps) {
  const { categories } = useCategoryStore();
  const { todos, addTodo } = useTodoStore();
  const { queue, addToQueue, removeFromQueue, insertAt, isInQueue } = useQueueStore();

  const availableCategories = categories.filter((c) => c.id !== WASTED_TIME_ID);
  const activeTodos = todos.filter((t) => !t.completed);

  // Queue items (in order)
  const queueTodos = queue
    .map((id) => activeTodos.find((t) => t.id === id))
    .filter(Boolean) as typeof activeTodos;

  // Remaining (not in queue), sorted by priority
  const remainingTodos = activeTodos
    .filter((t) => !isInQueue(t.id))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.title.localeCompare(b.title);
    });

  // --- Drag-and-drop state ---
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isOverQueue, setIsOverQueue] = useState(false);
  const [isOverList, setIsOverList] = useState(false);
  const dragSourceRef = useRef<'queue' | 'list'>('list');
  const queueContainerRef = useRef<HTMLDivElement>(null);
  const queueDragCounter = useRef(0);
  const listDragCounter = useRef(0);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategoryId, setQuickCategoryId] = useState('');
  const [quickPriority, setQuickPriority] = useState<1 | 2 | 3>(3);

  const handleTaskClick = (todoId: string, categoryId: string) => {
    if (disabled) return;
    if (selectedTodoId === todoId) {
      onTodoChange('');
    } else {
      onTodoChange(todoId);
      onCategoryChange(categoryId);
    }
  };

  const handleCategoryClick = (catId: string) => {
    if (disabled) return;
    if (selectedCategoryId === catId) {
      onCategoryChange('');
      return;
    }
    onCategoryChange(catId);
    onTodoChange('');
  };

  const handleOpenQuickAdd = () => {
    if (!showQuickAdd) {
      setShowQuickAdd(true);
    }
    if (!quickCategoryId) {
      setQuickCategoryId(selectedCategoryId || availableCategories[0]?.id || '');
    }
  };

  const handleQuickAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    const title = quickTitle.trim();
    if (!title || !quickCategoryId) return;
    addTodo({
      title,
      categoryId: quickCategoryId,
      priority: quickPriority,
    });
    setQuickTitle('');
    setShowQuickAdd(false);
  };

  // Calculate drop index from mouse position within the queue container
  const calcDropIndex = useCallback((clientY: number) => {
    const container = queueContainerRef.current;
    if (!container) return queueTodos.length;

    const cards = container.querySelectorAll('[data-queue-item]');
    if (cards.length === 0) return 0;

    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clientY < midY) return i;
    }
    return cards.length;
  }, [queueTodos.length]);

  // --- Drag start ---
  const handleDragStart = (e: React.DragEvent, todoId: string, source: 'queue' | 'list') => {
    setDraggedId(todoId);
    dragSourceRef.current = source;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', todoId);
  };

  // --- Queue zone: enter/leave/over/drop ---
  const handleQueueDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    queueDragCounter.current++;
    setIsOverQueue(true);
  };

  const handleQueueDragLeave = () => {
    queueDragCounter.current--;
    if (queueDragCounter.current <= 0) {
      queueDragCounter.current = 0;
      setIsOverQueue(false);
      setDropIndex(null);
    }
  };

  const handleQueueDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const idx = calcDropIndex(e.clientY);
    setDropIndex(idx);
  };

  const handleQueueDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const todoId = e.dataTransfer.getData('text/plain') || draggedId;
    if (todoId) {
      const idx = calcDropIndex(e.clientY);
      insertAt(todoId, idx);
    }
    // reset
    queueDragCounter.current = 0;
    setDraggedId(null);
    setDropIndex(null);
    setIsOverQueue(false);
    setIsOverList(false);
  };

  // --- List zone: enter/leave/over/drop (to remove from queue) ---
  const handleListDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    listDragCounter.current++;
    setIsOverList(true);
  };

  const handleListDragLeave = () => {
    listDragCounter.current--;
    if (listDragCounter.current <= 0) {
      listDragCounter.current = 0;
      setIsOverList(false);
    }
  };

  const handleListDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleListDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const todoId = e.dataTransfer.getData('text/plain') || draggedId;
    if (todoId && dragSourceRef.current === 'queue') {
      removeFromQueue(todoId);
    }
    listDragCounter.current = 0;
    setDraggedId(null);
    setDropIndex(null);
    setIsOverQueue(false);
    setIsOverList(false);
  };

  // --- Global drag end (cleanup if dropped outside any zone) ---
  const handleDragEnd = () => {
    queueDragCounter.current = 0;
    listDragCounter.current = 0;
    setDraggedId(null);
    setDropIndex(null);
    setIsOverQueue(false);
    setIsOverList(false);
  };

  const renderTaskCard = (
    todo: typeof activeTodos[0],
    source: 'queue' | 'list',
    index?: number,
  ) => {
    const cat = categories.find((c) => c.id === todo.categoryId);
    const pri = PRIORITY_LABELS[todo.priority] ?? PRIORITY_LABELS[3];
    const isSelected = selectedTodoId === todo.id;
    const isDragging = draggedId === todo.id;

    return (
      <div
        key={todo.id}
        data-queue-item={source === 'queue' ? 'true' : undefined}
        draggable={!disabled}
        onDragStart={(e) => handleDragStart(e, todo.id, source)}
        onDragEnd={handleDragEnd}
        className={`transition-opacity ${isDragging ? 'opacity-30' : 'opacity-100'}`}
      >
        <button
          onClick={() => handleTaskClick(todo.id, todo.categoryId)}
          disabled={disabled}
          className={`flex items-center gap-3 w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          } ${
            isSelected
              ? 'border-accent/40 bg-card/80'
              : 'border-card-border bg-card/60 hover:bg-card/80'
          }`}
        >
          {/* Queue position indicator */}
          {source === 'queue' && index !== undefined && (
            <span className="text-[10px] font-mono text-muted w-4 shrink-0 text-center">
              {index + 1}
            </span>
          )}

          {/* Drag handle */}
          <span className="text-muted/40 shrink-0 text-xs select-none">&#x2630;</span>

          {/* Title */}
          <span className="flex-1 text-sm truncate text-foreground/85">
            {todo.title}
          </span>

          {/* Right side: category badge + priority */}
          <div className="flex items-center gap-1.5 shrink-0">
            {cat && (
              <CategoryBadge abbreviation={cat.abbreviation} color={cat.color} size="sm" />
            )}
            <span className="text-[10px] font-bold" style={{ color: pri.color }}>
              {pri.label}
            </span>
          </div>

          {/* Add/remove from queue */}
          {source === 'list' && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); addToQueue(todo.id); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  addToQueue(todo.id);
                }
              }}
              className="text-[10px] text-muted hover:text-accent shrink-0 ml-1"
              title="Add to queue"
            >
              +
            </span>
          )}
          {source === 'queue' && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); removeFromQueue(todo.id); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFromQueue(todo.id);
                }
              }}
              className="text-[10px] text-muted hover:text-red-400 shrink-0 ml-1"
              title="Remove from queue"
            >
              &times;
            </span>
          )}
        </button>
      </div>
    );
  };

  // Build the queue list with drop indicators inserted at the right position
  const renderQueueWithIndicators = () => {
    const items: React.ReactNode[] = [];
    for (let i = 0; i < queueTodos.length; i++) {
      // Show drop indicator before this item
      if (isOverQueue && dropIndex === i && draggedId !== queueTodos[i].id) {
        items.push(
          <div key={`drop-${i}`} className="h-0.5 bg-accent rounded-full mx-2 my-0.5 transition-all" />
        );
      }
      items.push(renderTaskCard(queueTodos[i], 'queue', i));
    }
    // Show drop indicator at the end
    if (isOverQueue && dropIndex === queueTodos.length) {
      items.push(
        <div key="drop-end" className="h-0.5 bg-accent rounded-full mx-2 my-0.5 transition-all" />
      );
    }
    return items;
  };

  return (
    <div className={`grid gap-4 lg:gap-0 ${children ? 'lg:grid-cols-3 divide-x divide-card-border' : 'lg:grid-cols-2 divide-x divide-card-border'}`}>
      {/* Incompleted tasks */}
      <div
        className="px-0 lg:pr-4 min-h-0 order-2 lg:order-1"
        onDragEnter={handleListDragEnter}
        onDragLeave={handleListDragLeave}
        onDragOver={handleListDragOver}
        onDrop={handleListDrop}
      >
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-xs text-muted uppercase tracking-wider">Incompleted tasks</label>
          <button
            type="button"
            onClick={handleOpenQuickAdd}
            className="rounded-md border border-card-border bg-card/60 px-2 py-1 text-[11px] text-foreground/80 hover:text-foreground hover:bg-card/80"
          >
            +
          </button>
        </div>
        {(showQuickAdd || remainingTodos.length === 0) && (
          <form
            className="mb-3 rounded-lg border border-card-border bg-card/60 p-2 space-y-2"
            onSubmit={handleQuickAdd}
          >
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="New task title"
              className="w-full rounded bg-background px-2 py-1.5 text-xs border border-card-border focus:outline-none focus:border-accent"
            />
            <div className="flex items-center gap-2">
              <select
                value={quickCategoryId}
                onChange={(e) => setQuickCategoryId(e.target.value)}
                className="flex-1 rounded bg-background px-2 py-1.5 text-xs border border-card-border focus:outline-none focus:border-accent"
              >
                <option value="">Select category</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.abbreviation}
                  </option>
                ))}
              </select>
              <select
                value={quickPriority}
                onChange={(e) => setQuickPriority(Number(e.target.value) as 1 | 2 | 3)}
                className="w-20 rounded bg-background px-2 py-1.5 text-xs border border-card-border focus:outline-none focus:border-accent"
              >
                <option value={1}>P1</option>
                <option value={2}>P2</option>
                <option value={3}>P3</option>
              </select>
              <button
                type="submit"
                disabled={!quickTitle.trim() || !quickCategoryId}
                className="rounded bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </form>
        )}
        <div className={`space-y-1 max-h-[260px] overflow-y-auto pr-1 rounded-lg p-1 transition-colors ${
          isOverList && dragSourceRef.current === 'queue' ? 'bg-card/40 border border-dashed border-card-border' : ''
        }`}>
          {remainingTodos.length > 0 ? (
            remainingTodos.map((todo) => renderTaskCard(todo, 'list'))
          ) : (
            <div className="flex flex-col items-start justify-center gap-2 py-3 text-xs text-muted">
              <span>No incompleted tasks</span>
            </div>
          )}
        </div>
        {remainingTodos.length === 0 && draggedId && dragSourceRef.current === 'queue' && (
          <div className={`mt-2 min-h-[48px] rounded-lg border border-dashed p-2 flex items-center justify-center text-xs text-muted transition-colors ${
            isOverList ? 'border-accent/50 bg-card/50' : 'border-card-border'
          }`}>
            Drop here to remove from queue
          </div>
        )}
      </div>

      {/* Up Next + Categories */}
      <div className="px-0 lg:px-4 min-h-0 order-1 lg:order-2">
        <label className="mb-2 block text-xs text-muted uppercase tracking-wider">Up Next</label>
        <div
          ref={queueContainerRef}
          className={`space-y-1 min-h-[56px] rounded-lg border border-dashed p-2 transition-colors ${
            isOverQueue ? 'border-accent/50 bg-card/50' : 'border-card-border'
          }`}
          onDragEnter={handleQueueDragEnter}
          onDragLeave={handleQueueDragLeave}
          onDragOver={handleQueueDragOver}
          onDrop={handleQueueDrop}
        >
          {queueTodos.length === 0 && !isOverQueue ? (
            <div className="flex items-center justify-center h-10 text-xs text-muted">
              Drag tasks here to build your queue
            </div>
          ) : queueTodos.length === 0 && isOverQueue ? (
            <div className="flex items-center justify-center h-10">
              <div className="h-0.5 w-full bg-accent/60 rounded-full mx-2" />
            </div>
          ) : (
            renderQueueWithIndicators()
          )}
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-xs text-muted">Category</label>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                disabled={disabled}
                className={`flex items-center rounded-lg border px-2.5 py-2 text-sm transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-card/80 border-accent/40'
                    : 'border-transparent bg-card/60 hover:bg-card/80'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={
                  selectedCategoryId === cat.id
                    ? { borderColor: cat.color }
                    : undefined
                }
                title={cat.name}
              >
                <CategoryBadge abbreviation={cat.abbreviation} color={cat.color} size="sm" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Third column: Completed for the day (when children passed) */}
      {children ? (
        <div className="px-0 lg:pl-4 min-h-0 order-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
