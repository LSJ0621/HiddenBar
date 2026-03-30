'use client';

import type { Control } from 'react-hook-form';
import { OperatingHoursEditor } from '@/components/bars/operating-hours-editor';

interface BarFormStepHoursProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

/** Step 5: 영업시간 설정 */
export function BarFormStepHours({ control }: BarFormStepHoursProps) {
  return (
    <div data-testid="bar-form-step-5" className="space-y-8">
      <OperatingHoursEditor control={control} />
    </div>
  );
}
