/**
 * Format a YYYY-MM-DD string to "Feb 1, 2026" format.
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get number of days between two YYYY-MM-DD dates (inclusive).
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

/**
 * Generate array of YYYY-MM-DD dates from start to end (inclusive).
 */
export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format a short day label like "Feb 1" from YYYY-MM-DD.
 */
export function shortDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
