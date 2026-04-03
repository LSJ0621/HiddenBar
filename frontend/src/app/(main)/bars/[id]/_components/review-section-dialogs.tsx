'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmDeleteDialogProps {
  /** 다이얼로그 열림 여부 */
  open: boolean;
  /** 다이얼로그 닫기 핸들러 */
  onClose: () => void;
  /** 삭제 확인 핸들러 */
  onConfirm: () => void;
  /** 삭제 진행 중 여부 */
  isPending: boolean;
  /** 다이얼로그 제목 */
  title: string;
  /** 다이얼로그 설명 */
  description: string;
}

/**
 * 삭제 확인 공통 다이얼로그
 * 리뷰 일반 삭제 및 관리자 삭제에 공통으로 사용
 */
export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  title,
  description,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
