'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import { PhotoUploader } from '@/components/bars/photo-uploader';
import { useMediaQuery } from '@/hooks/use-media-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useCreateReview, useUpdateReview, useUploadReviewPhotos, useDeleteReviewPhoto } from '@/hooks/queries/use-reviews';
import { reviewSchema, type ReviewFormValues } from '@/lib/validations/review-schema';
import { MAX_REVIEW_CONTENT_LENGTH } from '@/lib/constants';
import type { ReviewItem } from '@/types/review';

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

  const formContent = (isMobile = false) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-6', isMobile && 'space-y-4')}>
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem className={cn(isMobile && 'space-y-1')}>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <StarRating
                  value={field.value}
                  onChange={field.onChange}
                  size={isMobile ? 'md' : 'lg'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem className={cn(isMobile && 'space-y-1')}>
              <FormLabel>Review</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="How was your experience?"
                  rows={isMobile ? 3 : 4}
                  maxLength={MAX_REVIEW_CONTENT_LENGTH}
                  className={cn(isMobile && 'text-sm')}
                />
              </FormControl>
              <div className="flex justify-between">
                <FormMessage />
                <span className="text-xs text-muted-foreground">
                  {field.value?.length ?? 0}/{MAX_REVIEW_CONTENT_LENGTH}
                </span>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="visitedAt"
          render={({ field }) => {
            const selectedDate = field.value ? parseISO(field.value) : undefined;

            return (
              <FormItem className={cn(isMobile && 'space-y-1')}>
                <FormLabel>Visit Date (optional)</FormLabel>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="size-4 text-muted-foreground" />
                          {selectedDate
                            ? format(selectedDate, 'MMM d, yyyy')
                            : 'Pick a date'}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                        }}
                        disabled={{ after: new Date() }}
                        defaultMonth={selectedDate}
                      />
                    </PopoverContent>
                  </Popover>
                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => field.onChange('')}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className={cn('space-y-2', isMobile && 'space-y-1.5')}>
          <label className="text-sm font-medium">Photos (optional)</label>
          <PhotoUploader
            files={newFiles}
            onFilesChange={setNewFiles}
            existingPhotos={isEditing ? existingPhotos : []}
            onDeleteExisting={isEditing ? handleDeleteExisting : undefined}
          />
        </div>
      </form>
    </Form>
  );

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
          {formContent(false)}
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
          {formContent(true)}
        </div>

        <SheetFooter className="flex-row gap-3 border-t border-border px-5 py-3">
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
