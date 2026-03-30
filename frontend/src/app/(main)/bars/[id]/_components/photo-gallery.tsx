'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ImageOff, Camera } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

interface Photo {
  id: number;
  url: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  barName: string;
  barId: number;
  isOwner: boolean;
}

/** Photo carousel with index indicator and empty state for owners */
export const PhotoGallery = React.memo(function PhotoGallery({
  photos,
  barName,
  barId,
  isOwner,
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleApiChange = useCallback((api: CarouselApi) => {
    if (!api) return;
    setCurrentIndex(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrentIndex(api.selectedScrollSnap());
    });
  }, []);

  if (photos.length === 0) {
    return (
      <section className="mb-6">
        <div className="flex aspect-[21/9] w-full flex-col items-center justify-center gap-3 rounded-lg bg-muted">
          <ImageOff className="size-12 text-muted-foreground/50" />
          {isOwner && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/bars/${barId}/edit`}>
                <Camera className="mr-1.5 size-4" />
                Add Photos
              </Link>
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <Carousel className="w-full" setApi={handleApiChange}>
        <CarouselContent>
          {photos.map((photo, index) => (
            <CarouselItem key={photo.id}>
              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg">
                <Image
                  src={photo.url}
                  alt={`${barName} photo ${index + 1}/${photos.length}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                  priority={index === 0}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {photos.length > 1 && (
          <>
            <CarouselPrevious />
            <CarouselNext />
            <p className="mt-2 text-center text-xs text-muted-foreground" aria-live="polite">
              {currentIndex + 1} / {photos.length}
            </p>
          </>
        )}
      </Carousel>
    </section>
  );
});
