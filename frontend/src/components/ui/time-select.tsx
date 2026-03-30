'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TimeSelectProps {
  /** 24시간 형식 "HH:mm" */
  value: string;
  /** 24시간 형식 "HH:mm"으로 반환 */
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/** 24시간 → 12시간 변환 */
function to12Hour(time24: string) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour: hour12, minute: m, period };
}

/** 12시간 → 24시간 변환 */
function to24Hour(hour12: number, minute: number, period: string): string {
  let h = hour12;
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/** AM/PM + Hour + Minute Select 기반 시간 선택기 */
export function TimeSelect({ value, onChange, disabled, className }: TimeSelectProps) {
  const { hour, minute, period } = to12Hour(value || '00:00');

  const handleChange = (part: 'period' | 'hour' | 'minute', val: string) => {
    const next = {
      hour: part === 'hour' ? Number(val) : hour,
      minute: part === 'minute' ? Number(val) : minute,
      period: part === 'period' ? val : period,
    };
    onChange(to24Hour(next.hour, next.minute, next.period));
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Select
        value={period}
        onValueChange={(v) => handleChange('period', v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[70px] px-2 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={String(hour)}
        onValueChange={(v) => handleChange('hour', v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[60px] px-2 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-sm text-muted-foreground">:</span>

      <Select
        value={String(minute)}
        onValueChange={(v) => handleChange('minute', v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[60px] px-2 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
