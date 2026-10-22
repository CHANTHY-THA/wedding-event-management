const DAY_MS = 86_400_000;

/** Whole calendar days from `now` until an ISO date (yyyy-mm-dd); negative once it has passed. */
export function daysUntil(isoDate: string, now: Date): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  const target = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / DAY_MS);
}

/** Compact relative time such as "5m ago", "3h ago" or "2d ago". */
export function timeAgo(isoTimestamp: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(isoTimestamp)) / 60_000));
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}
