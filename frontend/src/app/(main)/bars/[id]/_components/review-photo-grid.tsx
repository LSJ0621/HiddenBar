'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import type { ReviewPhoto } from '@/types/review';

interface ReviewPhotoGridProps {
  photos: ReviewPhoto[];
  className?: string;
}

/** 리뷰 사진 썸네일 그리드 + 클릭 시 확대 보기 */
export function ReviewPhotoGrid({ photos, className }: ReviewPhotoGridProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className={cn('flex gap-2 overflow-x-auto', className)}>
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            className="relative size-16 flex-shrink-0 overflow-hidden rounded-md border transition-opacity hover:opacity-80"
            onClick={() => setViewerIndex(index)}
          >
            <img
              src={photo.url}
              alt={`Review photo ${index + 1}`}
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* 확대 뷰어 */}
      <Dialog open={viewerIndex !== null} onOpenChange={() => setViewerIndex(null)}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          <div className="relative flex items-center justify-center">
            {viewerIndex !== null && (
              <img
                src={photos[viewerIndex].url}
                alt={`Review photo ${viewerIndex + 1}`}
                className="max-h-[80vh] rounded-lg object-contain"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 text-white hover:bg-white/20"
              onClick={() => setViewerIndex(null)}
            >
              <X className="size-5" />
            </Button>

            {viewerIndex !== null && viewerIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={() => setViewerIndex(viewerIndex - 1)}
              >
                <ChevronLeft className="size-6" />
              </Button>
            )}

            {viewerIndex !== null && viewerIndex < photos.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={() => setViewerIndex(viewerIndex + 1)}
              >
                <ChevronRight className="size-6" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
