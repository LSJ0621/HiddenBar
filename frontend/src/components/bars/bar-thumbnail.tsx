'use client';

import Image from 'next/image';
import { ImageOff } from 'lucide-react';

interface BarThumbnailProps {
  /** 이미지 URL. null이면 placeholder 아이콘을 표시한다. */
  src: string | null;
  /** 이미지 접근성 alt 텍스트 */
  alt: string;
  /** next/image sizes 속성 */
  sizes: string;
  /** LCP 최적화를 위한 priority 플래그 */
  priority?: boolean;
}

/**
 * 바 썸네일 이미지 컴포넌트.
 * src가 있으면 next/image로 렌더링하고, 없으면 ImageOff 아이콘 placeholder를 표시한다.
 */
export function BarThumbnail({ src, alt, sizes, priority }: BarThumbnailProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes={sizes}
        priority={priority}
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <ImageOff className="size-8" />
    </div>
  );
}
