'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useBookmarkMutation } from '@/hooks/queries/use-search';
import type { BookmarkItem } from '@/types';

/** useBookmarkEditMode 훅의 반환 타입 */
export interface UseBookmarkEditModeReturn {
  /** 현재 편집 모드 여부 */
  isEditMode: boolean;
  /** 선택된 아이템 ID 집합 */
  selectedIds: Set<number>;
  /** 일괄 삭제 진행 중 여부 */
  isDeleting: boolean;
  /** 모든 아이템이 선택되었는지 여부 */
  isAllSelected: boolean;
  /** 편집 모드 진입 */
  enterEditMode: () => void;
  /** 편집 모드 종료 및 선택 초기화 */
  exitEditMode: () => void;
  /** 단일 아이템 선택 토글 */
  toggleSelect: (id: number) => void;
  /** 전체 선택 / 전체 해제 토글 */
  toggleSelectAll: () => void;
  /** 선택된 아이템 일괄 삭제 */
  handleBatchDelete: () => Promise<void>;
  /** 편집 모드 아이템의 키보드 이벤트 핸들러 */
  handleItemKeyDown: (e: React.KeyboardEvent, id: number) => void;
}

/**
 * 북마크 편집 모드 상태와 동작을 관리하는 훅.
 *
 * 편집 모드 진입/종료, 아이템 선택/해제, 일괄 삭제 등의 로직을 캡슐화한다.
 *
 * @param items - 현재 페이지에 렌더링된 북마크 아이템 목록
 * @param page - 현재 페이지 번호 (페이지 변경 시 편집 모드 자동 해제에 사용)
 * @returns 편집 모드 상태 및 핸들러 객체
 */
export function useBookmarkEditMode(
  items: BookmarkItem[],
  page: number,
): UseBookmarkEditModeReturn {
  const bookmarkMutation = useBookmarkMutation();

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  /** 페이지 변경 시 편집 모드 해제 + 선택 초기화 */
  const prevPageRef = useRef(page);
  if (prevPageRef.current !== page) {
    prevPageRef.current = page;
    setIsEditMode(false);
    setSelectedIds(new Set());
  }

  /** 편집 모드 진입 */
  const enterEditMode = useCallback(() => {
    setIsEditMode(true);
  }, []);

  /** 편집 모드 종료 및 선택 초기화 */
  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setSelectedIds(new Set());
  }, []);

  /** 단일 아이템 선택 토글 */
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /** 전체 선택 / 전체 해제 토글 */
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  }, [items, selectedIds.size]);

  /** 선택된 아이템 일괄 삭제 */
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);

    const results = await Promise.allSettled(
      Array.from(selectedIds).map((barId) =>
        bookmarkMutation.mutateAsync({ barId, action: 'remove' }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed > 0) {
      toast.error(`${succeeded} removed, ${failed} failed`);
    } else {
      toast.success(`${succeeded} bookmark${succeeded > 1 ? 's' : ''} removed`);
    }

    exitEditMode();
    setIsDeleting(false);
  }, [selectedIds, bookmarkMutation, exitEditMode]);

  /** 편집 모드 아이템의 키보드 이벤트 핸들러 */
  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent, id: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSelect(id);
      }
    },
    [toggleSelect],
  );

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;

  return {
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
  };
}
