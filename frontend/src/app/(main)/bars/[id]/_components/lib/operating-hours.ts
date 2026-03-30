import { DayOfWeek } from '@/types';

/** Day ordering for operating hours table: MON → SUN */
export const DAY_ORDER = [
  DayOfWeek.MON,
  DayOfWeek.TUE,
  DayOfWeek.WED,
  DayOfWeek.THU,
  DayOfWeek.FRI,
  DayOfWeek.SAT,
  DayOfWeek.SUN,
];

export interface OperatingHoursEntry {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

/** Get today's day of week as DayOfWeek enum value */
export function getTodayDayOfWeek(): DayOfWeek {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const map: Record<number, DayOfWeek> = {
    0: DayOfWeek.SUN,
    1: DayOfWeek.MON,
    2: DayOfWeek.TUE,
    3: DayOfWeek.WED,
    4: DayOfWeek.THU,
    5: DayOfWeek.FRI,
    6: DayOfWeek.SAT,
  };
  return map[jsDay];
}

/** Format today's operating hours as a summary string (e.g. "오늘 18:00 - 02:00") */
export function getTodaySummary(operatingHours: OperatingHoursEntry[]): string | null {
  const today = getTodayDayOfWeek();
  const todayHours = operatingHours.find((h) => h.dayOfWeek === today);
  if (!todayHours) return null;
  if (todayHours.isClosed) return 'Closed Today';
  return `Today ${todayHours.openTime} - ${todayHours.closeTime}`;
}

/**
 * Check if the bar is currently open based on today's operating hours.
 * Returns `true` (open), `false` (closed), or `null` (no data for today).
 *
 * Note: Uses browser local time. May differ from the bar's actual timezone.
 */
export function isCurrentlyOpen(operatingHours: OperatingHoursEntry[]): boolean | null {
  const today = getTodayDayOfWeek();
  const todayHours = operatingHours.find((h) => h.dayOfWeek === today);
  if (!todayHours) return null;
  if (todayHours.isClosed) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = todayHours.openTime.split(':').map(Number);
  const [closeH, closeM] = todayHours.closeTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Handle overnight hours (e.g., 18:00 - 02:00)
  if (closeMinutes <= openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}
