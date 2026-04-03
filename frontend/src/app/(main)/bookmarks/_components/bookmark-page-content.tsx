'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { parseAsInteger, useQueryState } from 'nuqs';
import { Bookmark, ImageOff, Search, Pencil } from 'lucide-react';
import { useBookmarks } from '@/hooks/queries/use-bookmarks';
import { useBookmarkEditMode } from '@/hooks/use-bookmark-edit-mode';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { RatingBadge } from '@/components/ui/rating-badge';
import { formatRelativeDate } from '@/lib/date-utils';
import type { BookmarkItem } from '@/types';

/** 북마크 페이지 — 와이드 리스트 + 편집 모드 */
export function BookmarkPageContent() {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const { data, isLoading } = useBookmarks({ page });

  const items = data?.items ?? [];
  const totalItems = data?.meta.totalItems ?? 0;
  const totalPages = data?.meta.totalPages ?? 0;

  const {
    isEditMode,
    selectedIds,
    isDeleting,
    isAllSelected,
    enterEditMode,
    exitEditMode,
    toggleSelect,
    toggleSelectAll,
    handleBatchDelete,
    handleItemKeyDown,
  } = useBookmarkEditMode(items, page);

  /** 삭제 완료 후 페이지 유효성 보정 */
  useEffect(() => {
    if (!isLoading && totalPages > 0 && page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [isLoading, totalPages, page, setPage]);

  return (
    <div className={`container mx-auto px-4 py-8 md:px-6 lg:px-8${isEditMode ? ' pb-24' : ''}`}>
      {/* Header */}
      <div className="mx-auto mb-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-3xl tracking-tight md:text-4xl">My Bookmarks</h1>
            {!isLoading && totalItems > 0 && (
              <span className="text-sm text-muted-foreground" data-testid="bookmark-count">
                {isEditMode ? `${selectedIds.size} selected` : totalItems}
              </span>
            )}
          </div>
          {!isLoading && items.length > 0 && (
            isEditMode ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={exitEditMode}
                data-testid="bookmark-done-btn"
              >
                Done
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={enterEditMode}
                data-testid="bookmark-edit-btn"
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            )
          )}
        </div>
      </div>

      {isLoading ? (
        /* 스켈레톤 — 와이드 리스트 로우 */
        <div className="mx-auto max-w-4xl divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <Skeleton className="h-[106px] w-[160px] shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarked bars yet"
          description="Search for bars you like and bookmark them"
          action={
            <Button asChild>
              <Link href="/search">
                <Search className="size-4" />
                Search Bars
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div data-testid="bookmark-list" className="mx-auto max-w-4xl divide-y divide-border">
            {items.map((item: BookmarkItem) => {
              const isSelected = selectedIds.has(item.id);
              const content = (
                <>
                  {/* 썸네일 */}
                  <div className="relative h-[106px] w-[160px] shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-6" />
                      </div>
                    )}
                    {/* 편집 모드 체크박스 오버레이 */}
                    {isEditMode && (
                      <div className="absolute left-2 top-2 z-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          aria-label={`Select ${item.name}`}
                          data-testid={`bookmark-select-item-${item.id}`}
                          className="size-5 border-white/70 bg-black/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                        />
                      </div>
                    )}
                  </div>

                  {/* 바 정보 */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="line-clamp-1 text-base font-semibold">{item.name}</h3>
                    <div className="flex items-center gap-2">
                      <RatingBadge
                        averageRating={item.averageRating}
                        reviewCount={item.reviewCount}
                        showEmpty
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.city}, {item.country}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bookmarked {formatRelativeDate(item.bookmarkedAt)}
                    </p>
                  </div>

                </>
              );

              /* 조건부 렌더링: 기본 모드 → Link, 편집 모드 → div role="button" */
              if (isEditMode) {
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSelect(item.id)}
                    onKeyDown={(e) => handleItemKeyDown(e, item.id)}
                    className={`flex cursor-pointer items-center gap-4 border-l-2 py-4 pl-2 transition-colors ${
                      isSelected
                        ? 'border-l-primary bg-accent/20'
                        : 'border-l-transparent hover:bg-accent/30'
                    }`}
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={`/bars/${item.id}`}
                  className="flex items-center gap-4 border-l-2 border-l-transparent py-4 pl-2 transition-colors hover:border-l-primary hover:bg-accent/30"
                >
                  {content}
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div data-testid="bookmark-pagination" className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* 편집 모드 하단 액션 바 */}
      {isEditMode && items.length > 0 && (
        <div
          data-testid="bookmark-action-bar"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-4 py-3"
        >
          <div className="container mx-auto flex max-w-4xl items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              data-testid="bookmark-select-all"
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0 || isDeleting}
              onClick={handleBatchDelete}
              data-testid="bookmark-delete-selected"
            >
              {isDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
