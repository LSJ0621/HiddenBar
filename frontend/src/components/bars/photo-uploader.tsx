'use client';

import { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ACCEPTED_IMAGE_TYPES, MAX_PHOTO_SIZE_MB, MAX_PHOTOS } from '@/lib/constants';

interface PhotoUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingPhotos?: Array<{ id: number; url: string; order: number }>;
  onDeleteExisting?: (photoId: number) => void;
}

/** Drag-and-drop photo uploader with preview grid */
export function PhotoUploader({
  files,
  onFilesChange,
  existingPhotos = [],
  onDeleteExisting,
}: PhotoUploaderProps) {
  const totalCount = existingPhotos.length + files.length;
  const remaining = MAX_PHOTOS - totalCount;

  const onDrop = useCallback(
    (accepted: File[]) => {
      const limited = accepted.slice(0, remaining);
      onFilesChange([...files, ...limited]);
    },
    [files, onFilesChange, remaining],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ACCEPTED_IMAGE_TYPES.map((t) => `.${t.split('/')[1]}`) },
    maxSize: MAX_PHOTO_SIZE_MB * 1024 * 1024,
    disabled: remaining <= 0,
  });

  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    onFilesChange(next);
  };

  return (
    <div data-testid="photo-uploader" className="space-y-2">
      {/* 썸네일 스트립 — 드롭존 위에 가로로 표시 */}
      {(existingPhotos.length > 0 || files.length > 0) && (
        <div className="flex gap-2 overflow-x-auto py-1">
          {existingPhotos.map((photo, index) => (
            <div
              key={`existing-${photo.id}`}
              data-testid={`photo-uploader-preview-${index}`}
              className="relative size-12 flex-shrink-0 overflow-hidden rounded-md border"
            >
              <img
                src={photo.url}
                alt={`Photo ${index + 1}`}
                className="size-full object-cover"
              />
              {onDeleteExisting && (
                <button
                  type="button"
                  className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                  onClick={() => onDeleteExisting(photo.id)}
                >
                  <X className="size-2.5" />
                </button>
              )}
            </div>
          ))}

          {files.map((_, index) => (
            <div
              key={`new-${index}`}
              data-testid={`photo-uploader-preview-${existingPhotos.length + index}`}
              className="relative size-12 flex-shrink-0 overflow-hidden rounded-md border"
            >
              <img
                src={previews[index]}
                alt={`New photo ${index + 1}`}
                className="size-full object-cover"
              />
              <button
                type="button"
                className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                onClick={() => removeFile(index)}
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 드롭존 */}
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          remaining <= 0 && 'cursor-not-allowed opacity-50',
        )}
      >
        <input {...getInputProps()} />
        <ImagePlus className="mb-1.5 size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? 'Drop here'
            : `Drag photos or click to upload (max ${MAX_PHOTOS}, ${MAX_PHOTO_SIZE_MB}MB each)`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {totalCount}/{MAX_PHOTOS} uploaded
        </p>
      </div>
    </div>
  );
}
