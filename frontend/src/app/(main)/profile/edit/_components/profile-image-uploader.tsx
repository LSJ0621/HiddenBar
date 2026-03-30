'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, Loader2, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ACCEPTED_IMAGE_TYPES, MAX_PHOTO_SIZE_MB } from '@/lib/constants';

interface ProfileImageUploaderProps {
  currentImageUrl: string | null;
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

/** Circular profile image uploader with drag-and-drop */
export function ProfileImageUploader({
  currentImageUrl,
  onFileSelect,
  isUploading,
}: ProfileImageUploaderProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) {
        onFileSelect(accepted[0]);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ACCEPTED_IMAGE_TYPES.map((t) => `.${t.split('/')[1]}`) },
    maxSize: MAX_PHOTO_SIZE_MB * 1024 * 1024,
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        {...getRootProps()}
        data-testid="profile-image-uploader"
        className={cn(
          'group relative size-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary',
          isUploading && 'cursor-not-allowed opacity-60',
        )}
      >
        <input {...getInputProps()} />
        {currentImageUrl ? (
          <img
            src={currentImageUrl}
            alt="Profile image"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted">
            <User className="size-8 text-muted-foreground" />
          </div>
        )}
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-6 text-white" />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Click to change image</p>
    </div>
  );
}
