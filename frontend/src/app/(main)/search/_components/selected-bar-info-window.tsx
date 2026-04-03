'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import type { BarSummary } from '@/types';

interface SelectedBarInfoWindowProps {
  /** 선택된 바 정보 */
  bar: BarSummary;
}

/**
 * 지도 InfoWindow 내부에 렌더링되는 바 요약 UI.
 * 모바일(가로 컴팩트)과 데스크탑(세로) 레이아웃을 함께 제공한다.
 */
export function SelectedBarInfoWindow({ bar }: SelectedBarInfoWindowProps) {
  return (
    <>
      {/* 모바일: 가로 컴팩트 레이아웃 */}
      <Link
        href={`/bars/${bar.id}`}
        className="flex w-[200px] gap-2 no-underline md:hidden"
      >
        {bar.thumbnail ? (
          <div className="relative size-[60px] shrink-0 overflow-hidden rounded">
            <Image
              src={bar.thumbnail}
              alt={bar.name}
              fill
              className="object-cover"
              sizes="60px"
            />
          </div>
        ) : (
          <div className="flex size-[60px] shrink-0 items-center justify-center rounded bg-muted">
            <ImageOff className="size-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex min-w-0 flex-col justify-center">
          <p className="m-0 truncate text-sm font-semibold text-black">
            {bar.name}
          </p>
          <p className="m-0 mt-0.5 truncate text-xs text-muted-foreground">
            {bar.address}
          </p>
          {bar.averageRating > 0 && (
            <p className="m-0 mt-0.5 text-xs text-amber-600">
              ★ {bar.averageRating.toFixed(1)}
              <span className="ml-1 text-muted-foreground">
                ({bar.reviewCount})
              </span>
            </p>
          )}
        </div>
      </Link>
      {/* 데스크탑: 세로 레이아웃 */}
      <Link
        href={`/bars/${bar.id}`}
        className="hidden w-[200px] no-underline md:block"
      >
        {bar.thumbnail ? (
          <div className="relative mb-1.5 h-[100px] w-full overflow-hidden rounded">
            <Image
              src={bar.thumbnail}
              alt={bar.name}
              fill
              className="object-cover"
              sizes="200px"
            />
          </div>
        ) : (
          <div className="mb-1.5 flex h-[100px] w-full items-center justify-center rounded bg-muted">
            <ImageOff className="size-6 text-muted-foreground" />
          </div>
        )}
        <p className="m-0 text-sm font-semibold text-black">
          {bar.name}
        </p>
        <p className="m-0 mt-0.5 text-xs text-muted-foreground">
          {bar.address}
        </p>
        {bar.averageRating > 0 && (
          <p className="m-0 mt-1 text-xs text-amber-600">
            ★ {bar.averageRating.toFixed(1)}
            <span className="ml-1 text-muted-foreground">
              ({bar.reviewCount})
            </span>
          </p>
        )}
      </Link>
    </>
  );
}
