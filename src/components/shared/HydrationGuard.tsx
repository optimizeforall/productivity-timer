'use client';

import { useEffect, useState } from 'react';

/**
 * Prevents hydration mismatch errors when using Zustand's persist middleware.
 * Wraps client components that depend on localStorage-backed state.
 */
export default function HydrationGuard({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
      </div>
    );
  }

  return <>{children}</>;
}
