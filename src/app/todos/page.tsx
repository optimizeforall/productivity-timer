'use client';

import TodoList from '@/components/todos/TodoList';
import HydrationGuard from '@/components/shared/HydrationGuard';

function TodosContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tasks</h1>
      <TodoList />
    </div>
  );
}

export default function TodosPage() {
  return (
    <HydrationGuard>
      <TodosContent />
    </HydrationGuard>
  );
}
