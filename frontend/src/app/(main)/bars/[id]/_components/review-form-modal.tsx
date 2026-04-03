'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useCreateReview, useUpdateReview, useUploadReviewPhotos, useDeleteReviewPhoto } from '@/hooks/queries/use-reviews';
import { reviewSchema, type ReviewFormValues } from '@/lib/validations/review-schema';
import type { ReviewItem } from '@/types/review';
import { ReviewFormFields } from './review-form-fields';

interface ReviewFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barId: number;
  /** 수정 대상 리뷰 (null이면 신규 작성) */
  editingReview?: ReviewItem | null;
}

/** 리뷰 작성/수정 모달 — Desktop: Dialog, Mobile: Sheet */
export function ReviewFormModal({
  open,
  onOpenChange,
  barId,
  editingReview,
}: ReviewFormModalProps) {
  const { matches: isDesktop } = useMediaQuery('(min-width: 1024px)');
  const isEditing = !!editingReview;

  const createReview = useCreateReview();
  const updateReview = useUpdateReview(editingReview?.id ?? 0, barId);
  const uploadPhotos = useUploadReviewPhotos(editingReview?.id ?? 0, barId);
  const deletePhoto = useDeleteReviewPhoto(editingReview?.id ?? 0, barId);

  const [newFiles, setNewFiles] = useState<File[]>([]);

  const form = useForm<ReviewFormValues>({
    resolver: standardSchemaResolver(reviewSchema),
    defaultValues: {
      rating: editingReview?.rating ?? 0,
      content: editingReview?.content ?? '',
      visitedAt: editingReview?.visitedAt ?? '',
    },
  });

  useEffect(() => {
    if (editingReview) {
      form.reset({
        rating: editingReview.rating,
        content: editingReview.content,
        visitedAt: editingReview.visitedAt ?? '',
      });
    } else {
      form.reset({ rating: 0, content: '', visitedAt: '' });
    }
  }, [editingReview, form]);

  const existingPhotos = (editingReview?.photos ?? []).map((p) => ({
    id: p.id,
    url: p.url,
    order: p.sortOrder,
  }));

  const handleDeleteExisting = (photoId: number) => {
    deletePhoto.mutate(photoId);
  };

  /** 폼 제출 핸들러 — 신규 작성 및 수정 모두 처리 */
  const onSubmit = async (values: ReviewFormValues) => {
    try {
      if (isEditing) {
        await updateReview.mutateAsync({
          rating: values.rating,
          content: values.content,
          visitedAt: values.visitedAt || undefined,
        });

        if (newFiles.length > 0) {
          await uploadPhotos.mutateAsync(newFiles);
        }

        toast.success('Review updated');
      } else {
        const created = await createReview.mutateAsync({
          barId,
          rating: values.rating,
          content: values.content,
          visitedAt: values.visitedAt || undefined,
        });

        if (newFiles.length > 0) {
          try {
            const formData = new FormData();
            newFiles.forEach((file) => formData.append('files', file));
            await api.post(API_ENDPOINTS.REVIEWS.PHOTOS(created.id), formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } catch {
            toast.error('Review saved, but photo upload failed. You can add photos by editing.');
          }
        }

        toast.success('Review submitted');
      }

      setNewFiles([]);
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? 'Failed to update review' : 'Failed to submit review');
    }
  };

  const isPending = createReview.isPending || updateReview.isPending || uploadPhotos.isPending;

  const title = isEditing ? 'Edit Review' : 'Write a Review';
  const description = isEditing
    ? 'Update your review for this bar.'
    : 'Share your experience at this bar.';

  /** 공통 폼 필드 props */
  const fieldProps = {
    form,
    newFiles,
    onFilesChange: setNewFiles,
    isEditing,
    existingPhotos,
    onDeleteExisting: handleDeleteExisting,
    onSubmit,
  };

  const footer = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
        Cancel
      </Button>
      <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {isEditing ? 'Update' : 'Submit'}
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <ReviewFormFields {...fieldProps} isMobile={false} />
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[75vh] rounded-t-2xl"
        showCloseButton={false}
      >
        {/* 드래그 핸들 인디케이터 */}
        <div className="flex justify-center pb-1 pt-2">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="px-5 pb-2 pt-0">
          <SheetTitle className="text-base">{title}</SheetTitle>
          <SheetDescription className="text-xs">{description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-2 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ReviewFormFields {...fieldProps} isMobile={true} />
        </div>

        <SheetFooter className="flex-row gap-3 border-t border-border px-5 py-3">
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
