'use client';

import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, Shield, Flag } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StarRating } from '@/components/ui/star-rating';
import { REVIEW_STATUS_LABELS, REVIEW_STATUS_VARIANTS } from '@/lib/constants';
import { ReviewStatus } from '@my-project/shared';
import type { ReviewItem } from '@/types/review';

import { ReviewPhotoGrid } from './review-photo-grid';

interface ReviewCardProps {
  review: ReviewItem;
  /** 현재 로그인 유저 ID */
  currentUserId?: number;
  /** 관리자 여부 */
  isAdmin?: boolean;
  /** 수정 클릭 */
  onEdit?: () => void;
  /** 삭제 클릭 */
  onDelete?: () => void;
  /** 관리자: 상태 변경 클릭 */
  onModerate?: () => void;
  /** 관리자: 삭제 클릭 */
  onAdminDelete?: () => void;
  /** 신고 클릭 */
  onReport?: () => void;
  className?: string;
}

/** 개별 리뷰 카드 */
export function ReviewCard({
  review,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
  onModerate,
  onAdminDelete,
  onReport,
  className,
}: ReviewCardProps) {
  const isMyReview = currentUserId === review.author.id;
  const canReport = !!currentUserId && !isMyReview && !isAdmin;
  const showMenu = isMyReview || isAdmin || canReport;
  const initials = review.author.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div data-testid={`review-card-${review.id}`} className={cn('space-y-3 rounded-lg border border-border p-4', className)}>
      {/* 헤더: 아바타 + 이름 + 별점 + 날짜 + 메뉴 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarImage src={review.author.profileImageUrl ?? undefined} alt={review.author.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{review.author.name}</span>
              {review.status !== ReviewStatus.PUBLISHED && isAdmin && (
                <Badge variant={REVIEW_STATUS_VARIANTS[review.status]} className="text-xs">
                  {REVIEW_STATUS_LABELS[review.status]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StarRating value={review.rating} size="sm" />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isMyReview && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {isAdmin && !isMyReview && (
                <>
                  <DropdownMenuItem onClick={onModerate}>
                    <Shield className="size-4" />
                    Change Status
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onAdminDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {canReport && (
                <DropdownMenuItem onClick={onReport}>
                  <Flag className="size-4" />
                  Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 본문 */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{review.content}</p>

      {/* 방문 날짜 */}
      {review.visitedAt && (
        <p className="text-xs text-muted-foreground">
          Visited: {new Date(review.visitedAt).toLocaleDateString()}
        </p>
      )}

      {/* 사진 */}
      <ReviewPhotoGrid photos={review.photos} />
    </div>
  );
}
