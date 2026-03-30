'use client';

import type { Control } from 'react-hook-form';
import { MenuEditor } from '@/components/bars/menu-editor';

interface BarFormStepMenuProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

/** Step 4: 메뉴 아이템 입력 */
export function BarFormStepMenu({ control }: BarFormStepMenuProps) {
  return (
    <div data-testid="bar-form-step-4" className="space-y-8">
      <MenuEditor control={control} />
    </div>
  );
}
