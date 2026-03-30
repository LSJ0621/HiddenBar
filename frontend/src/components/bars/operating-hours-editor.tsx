'use client';

import type { Control, ControllerRenderProps } from 'react-hook-form';
import { DayOfWeek } from '@/types';
import { DAY_OF_WEEK_LABELS } from '@/lib/constants';
import { Switch } from '@/components/ui/switch';
import { TimeSelect } from '@/components/ui/time-select';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from '@/components/ui/form';

interface OperatingHoursEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

const DAYS = Object.values(DayOfWeek) as DayOfWeek[];
const DAY_KEYS: Record<DayOfWeek, string> = {
  [DayOfWeek.MON]: 'mon',
  [DayOfWeek.TUE]: 'tue',
  [DayOfWeek.WED]: 'wed',
  [DayOfWeek.THU]: 'thu',
  [DayOfWeek.FRI]: 'fri',
  [DayOfWeek.SAT]: 'sat',
  [DayOfWeek.SUN]: 'sun',
};

/** 영업시간 편집기 (7일 고정 행) */
export function OperatingHoursEditor({ control }: OperatingHoursEditorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Operating Hours</h3>

      {DAYS.map((day, index) => (
        <div
          key={day}
          data-testid={`operating-hours-${DAY_KEYS[day]}`}
          className="flex items-center gap-3 rounded-lg border p-3"
        >
          <div className="w-10 shrink-0 text-sm font-medium">
            {DAY_OF_WEEK_LABELS[day]}
          </div>

          <FormField
            control={control}
            name={`operatingHours.${index}.openTime`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TimeFieldWithClosed
                    control={control}
                    index={index}
                    field={field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <span className="shrink-0 text-sm text-muted-foreground">~</span>

          <FormField
            control={control}
            name={`operatingHours.${index}.closeTime`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TimeFieldWithClosed
                    control={control}
                    index={index}
                    field={field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FormField
              control={control}
              name={`operatingHours.${index}.isClosed`}
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel className="text-xs">Closed</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** isClosed 상태와 연동되는 TimeSelect 래퍼 */
function TimeFieldWithClosed({
  control,
  index,
  field,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any>;
}) {
  return (
    <FormField
      control={control}
      name={`operatingHours.${index}.isClosed`}
      render={({ field: closedField }) => (
        <TimeSelect
          value={field.value}
          onChange={field.onChange}
          disabled={closedField.value === true}
        />
      )}
    />
  );
}
