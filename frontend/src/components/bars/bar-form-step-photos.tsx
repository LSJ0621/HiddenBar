'use client';

import { PhotoUploader } from '@/components/bars/photo-uploader';

interface BarFormStepPhotosProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingPhotos?: Array<{ id: number; url: string; order: number }>;
  onDeleteExisting?: (photoId: number) => void;
}

/** Step 3: Photo upload */
export function BarFormStepPhotos({
  files,
  onFilesChange,
  existingPhotos,
  onDeleteExisting,
}: BarFormStepPhotosProps) {
  return (
    <div data-testid="bar-form-step-3" className="space-y-6">
      <h3 className="text-sm font-medium">Photos</h3>
      <p className="text-sm text-muted-foreground">
        The first photo will be used as the bar&apos;s thumbnail. Upload your best photo first.
      </p>
      <PhotoUploader
        files={files}
        onFilesChange={onFilesChange}
        existingPhotos={existingPhotos}
        onDeleteExisting={onDeleteExisting}
      />
    </div>
  );
}
