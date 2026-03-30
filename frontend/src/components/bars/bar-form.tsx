'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  createBarSchema,
  type CreateBarFormValues,
} from '@/lib/validations/bar-schema';
import { useCreateBar, useUpdateBar, useUploadPhotos } from '@/hooks/queries/use-bars';
import api from '@/lib/api';
import { DayOfWeek } from '@/types';
import type { BarPhoto } from '@/types';
import { BarFormStepBasic } from '@/components/bars/bar-form-step-basic';
import { BarFormStepLocation } from '@/components/bars/bar-form-step-location';
import { BarFormStepPhotos } from '@/components/bars/bar-form-step-photos';
import { BarFormStepMenu } from '@/components/bars/bar-form-step-details';
import { BarFormStepHours } from '@/components/bars/bar-form-step-hours';

const STEPS = [
  { label: 'Basic Info' },
  { label: 'Location' },
  { label: 'Photos' },
  { label: 'Menu' },
  { label: 'Hours' },
];
const LAST_STEP = STEPS.length;

const DEFAULT_OPERATING_HOURS = Object.values(DayOfWeek).map((day) => ({
  dayOfWeek: day,
  openTime: '09:00',
  closeTime: '22:00',
  isClosed: false,
}));

interface BarFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<CreateBarFormValues>;
  barId?: number;
  existingPhotos?: Array<{ id: number; url: string; order: number }>;
}

/** Multi-step bar registration/edit wizard */
export function BarForm({
  mode,
  defaultValues,
  barId,
  existingPhotos: initialExistingPhotos,
}: BarFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState(initialExistingPhotos ?? []);

  const form = useForm<CreateBarFormValues>({
    resolver: standardSchemaResolver(createBarSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      city: '',
      country: '',
      latitude: undefined as unknown as number,
      longitude: undefined as unknown as number,
      phone: '',
      website: '',
      menuItems: [],
      operatingHours: DEFAULT_OPERATING_HOURS,
      ...defaultValues,
    },
  });

  const createBar = useCreateBar();
  const updateBar = useUpdateBar(barId ?? 0);
  const uploadPhotos = useUploadPhotos(barId ?? 0);
  const [isUploading, setIsUploading] = useState(false);

  const isSubmitting = createBar.isPending || updateBar.isPending || uploadPhotos.isPending || isUploading;

  const stepFieldNames: Record<number, (keyof CreateBarFormValues)[]> = {
    1: ['name', 'description'],
    2: ['address', 'city', 'country', 'latitude', 'longitude', 'phone', 'website'],
    3: [],
    4: ['menuItems'],
    5: ['operatingHours'],
  };

  const goNext = async () => {
    const fields = stepFieldNames[currentStep];
    if (fields.length > 0) {
      const valid = await form.trigger(fields);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, LAST_STEP));
  };

  const goPrev = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const onSubmit = async (values: CreateBarFormValues) => {
    if (currentStep !== LAST_STEP) return;
    try {
      if (mode === 'create') {
        const bar = await createBar.mutateAsync(values);
        if (files.length > 0) {
          setIsUploading(true);
          const formData = new FormData();
          files.forEach((file) => formData.append('files', file));
          await api.post<{ photos: BarPhoto[] }>(`/bars/${bar.id}/photos`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setIsUploading(false);
        }
        toast.success('Bar has been registered');
        router.push('/my-bars');
      } else {
        await updateBar.mutateAsync(values);
        if (files.length > 0) {
          await uploadPhotos.mutateAsync(files);
        }
        toast.success('Bar has been updated');
        router.push(`/bars/${barId}`);
      }
    } catch {
      setIsUploading(false);
      toast.error(mode === 'create' ? 'Failed to register bar' : 'Failed to update bar');
    }
  };

  const triggerSubmit = form.handleSubmit(onSubmit);

  const handleDeleteExisting = (photoId: number) => {
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}
        className="space-y-8"
      >
        {mode === 'edit' && (
          <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/15 p-4 text-sm text-warning-foreground">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold">Review Status Notice</p>
              <p className="mt-1">Saving changes will set the review status to &apos;Under Review&apos;. It will be published again after admin approval.</p>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStep;
            const isDone = stepNum < currentStep;

            return (
              <div key={step.label} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                    isActive && 'bg-primary text-primary-foreground',
                    isDone && 'bg-primary/20 text-primary',
                    !isActive && !isDone && 'bg-muted text-muted-foreground',
                  )}
                >
                  {stepNum}
                </div>
                <span
                  className={cn(
                    'hidden text-sm sm:inline',
                    isActive ? 'font-medium' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <div className="mx-2 h-px flex-1 bg-border" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <BarFormStepBasic control={form.control} />
        )}
        {currentStep === 2 && (
          <BarFormStepLocation control={form.control} />
        )}
        {currentStep === 3 && (
          <BarFormStepPhotos
            files={files}
            onFilesChange={setFiles}
            existingPhotos={existingPhotos}
            onDeleteExisting={handleDeleteExisting}
          />
        )}
        {currentStep === 4 && (
          <BarFormStepMenu control={form.control} />
        )}
        {currentStep === 5 && (
          <BarFormStepHours control={form.control} />
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            data-testid="bar-form-prev-button"
            onClick={goPrev}
            disabled={currentStep === 1}
          >
            Previous
          </Button>

          {currentStep < LAST_STEP ? (
            <Button
              type="button"
              data-testid="bar-form-next-button"
              onClick={goNext}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              data-testid="bar-form-submit-button"
              disabled={isSubmitting}
              onClick={() => triggerSubmit()}
            >
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === 'create' ? 'Register' : 'Save Changes'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
