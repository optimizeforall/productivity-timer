export function getLocalDateKeyFromDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getLogicalDayKey(iso: string, dayEndsAtHour: number) {
  const d = new Date(iso);
  const shifted = new Date(d.getTime() - dayEndsAtHour * 60 * 60 * 1000);
  return getLocalDateKeyFromDate(shifted);
}

export function buildDateForLogicalDay(
  dayKey: string,
  timeValue: string,
  dayEndsAtHour: number,
) {
  const [hourRaw, minuteRaw] = timeValue.split(':').map(Number);
  const hour = Number.isFinite(hourRaw) ? hourRaw : 0;
  const minute = Number.isFinite(minuteRaw) ? minuteRaw : 0;

  const base = new Date(`${dayKey}T00:00:00`);
  if (hour < dayEndsAtHour) {
    base.setDate(base.getDate() + 1);
  }
  base.setHours(hour, minute, 0, 0);
  return base;
}
