'use client';

import { useState } from 'react';
import { useFieldArray, type Control, type ControllerRenderProps } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';

interface MenuEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

/** Editable menu items list with add/remove rows */
export function MenuEditor({ control }: MenuEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'menuItems',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Menu</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="menu-editor-add"
          onClick={() =>
            append({ name: '', description: '', price: 0, currency: 'USD' })
          }
        >
          <Plus className="mr-1 size-4" />
          Add
        </Button>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          data-testid={`menu-item-${index}`}
          className="grid grid-cols-12 gap-2 rounded-lg border p-3"
        >
          <div className="col-span-12 sm:col-span-4">
            <FormField
              control={control}
              name={`menuItems.${index}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Menu name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="col-span-12 sm:col-span-3">
            <FormField
              control={control}
              name={`menuItems.${index}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Description" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="col-span-6 sm:col-span-2">
            <FormField
              control={control}
              name={`menuItems.${index}.price`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                      <PriceInput field={field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="col-span-6 flex items-end justify-end sm:col-span-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}

      {fields.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No menu items yet. Click the Add button to add a menu item.
        </p>
      )}
    </div>
  );
}

/** 소수점 입력이 가능한 가격 입력 컴포넌트 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PriceInput({ field }: { field: ControllerRenderProps<any> }) {
  const [display, setDisplay] = useState(() =>
    field.value === 0 ? '' : String(field.value),
  );

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder="0.00"
      className="pl-7"
      value={display}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        const parts = raw.split('.');
        const sanitized =
          parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw;
        setDisplay(sanitized);
      }}
      onBlur={() => {
        const num = display === '' ? 0 : Number(display);
        field.onChange(num);
        setDisplay(num === 0 ? '' : String(num));
      }}
    />
  );
}
