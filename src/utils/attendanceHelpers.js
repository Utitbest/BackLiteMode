export const LATE_CUTOFF_HOUR = 9; // 9:00 AM — hardcoded for now, easy to make configurable per site later

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function isLate(date) {
  return date.getHours() >= LATE_CUTOFF_HOUR;
}