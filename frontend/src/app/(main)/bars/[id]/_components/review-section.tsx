'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, LogIn, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useAuthStore } from '@/hooks/use-auth';
import { useBarReviews, useMyReview, useDeleteReview } from '@/hooks/queries/use-reviews';
import { useAdminDeleteReview } from '@/hooks/queries/use-admin-reviews';
import { Role } from '@my-project/shared';
import type { ReviewItem } from '@/types/review';

import { ReviewStatsSummary } from './review-stats-summary';
import { ReviewCard } from './review-card';
import { ReviewFormModal } from './review-form-modal';
import { ReviewModerateDialog } from './review-moderate-dialog';
import { ReviewReportDialog } from './review-report-dialog';

interface ReviewSectionProps {
  barId: number;
  isOwner: boolean;
}

/** 리뷰 통합 섹션 — Desktop flat + Mobile Accordion */
export const ReviewSection = React.memo(function ReviewSection({
  barId,
  isOwner,
}: ReviewSectionProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const isAdmin = user?.role === Role.ADMIN;
  const sectionRef = useRef<HTMLDivElement>(null);

  // 로컬 UI 상태
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [moderateReview, setModerateReview] = useState<ReviewItem | null>(null);
  const [adminDeleteId, setAdminDeleteId] = useState<number | null>(null);
  const [reportReview, setReportReview] = useState<ReviewItem | null>(null);

  // 쿼리
  const { data: reviewData, isLoading } = useBarReviews(barId, { page });
  const { data: myReview } = useMyReview(barId);
  const deleteReview = useDeleteReview(barId);
  const adminDelete = useAdminDeleteReview(barId);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleWriteClick = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setEditingReview(null);
    setFormOpen(true);
  };

  const handleEditClick = (review: ReviewItem) => {
    setEditingReview(review);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId === null) return;
    await deleteReview.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const handleAdminDeleteConfirm = async () => {
    if (adminDeleteId === null) return;
    await adminDelete.mutateAsync(adminDeleteId);
    setAdminDeleteId(null);
  };

  const handleReportClick = (review: ReviewItem) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setReportReview(review);
  };

  // 비로그인 시 로그인 유도 UI
  if (!isAuthenticated) {
    return (
      <>
        {/* Desktop */}
        <section className="hidden lg:block" ref={sectionRef}>
          <h2 className="mb-4 text-xl font-semibold">Reviews</h2>
          <LoginPrompt onLogin={() => router.push('/login')} />
        </section>

        {/* Mobile */}
        <AccordionItem value="reviews" className="lg:hidden">
          <AccordionTrigger className="text-base font-semibold">Reviews</AccordionTrigger>
          <AccordionContent>
            <LoginPrompt onLogin={() => router.push('/login')} />
          </AccordionContent>
        </AccordionItem>
      </>
    );
  }

  const stats = reviewData?.stats;
  const items = reviewData?.items ?? [];
  const meta = reviewData?.meta;
  const hasMyReview = !!myReview;

  const reviewContent = (
    <div className="space-y-6">
      {/* 통계 */}
      {stats && <ReviewStatsSummary stats={stats} />}

      {/* 작성 버튼 */}
      <div className="flex items-center justify-end">
        <Button
          data-testid="review-write-button"
          onClick={hasMyReview ? () => handleEditClick(myReview!) : handleWriteClick}
          size="sm"
        >
          {hasMyReview ? (
            <>
              <Pencil className="size-4" />
              Edit My Review
            </>
          ) : (
            'Write a Review'
          )}
        </Button>
      </div>

      {/* 리뷰 목록 */}
      {isLoading ? (
        <ReviewListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="Be the first to share your experience!"
          className="py-8"
        />
      ) : (
        <div className="space-y-4">
          {items.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onEdit={() => handleEditClick(review)}
              onDelete={() => setDeleteConfirmId(review.id)}
              onModerate={() => setModerateReview(review)}
              onAdminDelete={() => setAdminDeleteId(review.id)}
              onReport={() => handleReportClick(review)}
            />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );

  const totalCount = stats?.totalCount ?? 0;

  return (
    <>
      {/* Desktop: Flat section */}
      <section className="hidden lg:block" ref={sectionRef}>
        <h2 className="mb-4 text-xl font-semibold">
          Reviews{totalCount > 0 && ` (${totalCount})`}
        </h2>
        {reviewContent}
      </section>

      {/* Mobile: Accordion */}
      <AccordionItem value="reviews" className="lg:hidden">
        <AccordionTrigger className="text-base font-semibold">
          Reviews{totalCount > 0 && ` (${totalCount})`}
        </AccordionTrigger>
        <AccordionContent>{reviewContent}</AccordionContent>
      </AccordionItem>

      {/* 리뷰 작성/수정 모달 */}
      <ReviewFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        barId={barId}
        editingReview={editingReview}
      />

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteReview.isPending}
            >
              {deleteReview.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 관리자 삭제 확인 다이얼로그 */}
      <Dialog open={adminDeleteId !== null} onOpenChange={() => setAdminDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review (Admin)</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this review?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleAdminDeleteConfirm}
              disabled={adminDelete.isPending}
            >
              {adminDelete.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 관리자 상태 변경 다이얼로그 */}
      {moderateReview && (
        <ReviewModerateDialog
          open={!!moderateReview}
          onOpenChange={(open) => !open && setModerateReview(null)}
          reviewId={moderateReview.id}
          barId={barId}
          currentStatus={moderateReview.status}
        />
      )}

      {/* 리뷰 신고 다이얼로그 */}
      {reportReview && (
        <ReviewReportDialog
          open={!!reportReview}
          onOpenChange={(open) => !open && setReportReview(null)}
          reviewId={reportReview.id}
          barId={barId}
        />
      )}
    </>
  );
});

/** 로그인 유도 UI */
function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div data-testid="review-login-prompt" className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
      <LogIn className="size-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">Log in to see reviews</p>
      <Button size="sm" onClick={onLogin}>
        Log In
      </Button>
    </div>
  );
}

/** 리뷰 목록 스켈레톤 */
function ReviewListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
