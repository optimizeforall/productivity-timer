'use client';

import { useEffect, useState } from 'react';
import { useTimerStore } from '@/stores/useTimerStore';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function TimerDisplay() {
  const { status, getElapsedMs } = useTimerStore();
  const [display, setDisplay] = useState('00:00:00');

  useEffect(() => {
    if (status === 'idle') {
      setDisplay('00:00:00');
      return;
    }

    if (status === 'paused') {
      setDisplay(formatTime(getElapsedMs()));
      return;
    }

    // Running - update every second
    const interval = setInterval(() => {
      setDisplay(formatTime(getElapsedMs()));
    }, 1000);

    // Immediate update
    setDisplay(formatTime(getElapsedMs()));

    return () => clearInterval(interval);
  }, [status, getElapsedMs]);

  return (
    <div className="text-center">
      <div className="font-sans text-7xl font-semibold tracking-tight tabular-nums">
        {display}
      </div>
      <div className="mt-2 text-sm text-muted">
        {status === 'idle' && 'Ready'}
        {status === 'running' && 'Running'}
        {status === 'paused' && 'Paused'}
      </div>
    </div>
  );
}
