'use client';

import { parseISO, format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { MAX_REVIEW_CONTENT_LENGTH } from '@/lib/constants';
import type { ReviewFormValues } from '@/lib/validations/review-schema';

interface ReviewFormFieldsProps {
  /** react-hook-form의 form 객체 */
  form: UseFormReturn<ReviewFormValues>;
  /** 모바일 레이아웃 여부 */
  isMobile?: boolean;
  /** 새로 추가할 사진 파일 목록 */
  newFiles: File[];
  /** 사진 파일 목록 변경 핸들러 */
  onFilesChange: (files: File[]) => void;
  /** 수정 모드 여부 */
  isEditing: boolean;
  /** 기존 사진 목록 (수정 모드에서만 사용) */
  existingPhotos: { id: number; url: string; order: number }[];
  /** 기존 사진 삭제 핸들러 (수정 모드에서만 사용) */
  onDeleteExisting?: (photoId: number) => void;
  /** form submit 핸들러 */
  onSubmit: (values: ReviewFormValues) => Promise<void>;
}

/**
 * 리뷰 폼 필드 렌더링 컴포넌트
 * 별점, 내용, 방문일, 사진 업로드 필드를 포함한다.
 */
export function ReviewFormFields({
  form,
  isMobile = false,
  newFiles,
  onFilesChange,
  isEditing,
  existingPhotos,
  onDeleteExisting,
  onSubmit,
}: ReviewFormFieldsProps) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('space-y-6', isMobile && 'space-y-4')}
      >
        {/* 별점 필드 */}
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

        {/* 리뷰 내용 필드 */}
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

        {/* 방문일 필드 */}
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

        {/* 사진 업로드 필드 */}
        <div className={cn('space-y-2', isMobile && 'space-y-1.5')}>
          <label className="text-sm font-medium">Photos (optional)</label>
          <PhotoUploader
            files={newFiles}
            onFilesChange={onFilesChange}
            existingPhotos={isEditing ? existingPhotos : []}
            onDeleteExisting={isEditing ? onDeleteExisting : undefined}
          />
        </div>
      </form>
    </Form>
  );
}
