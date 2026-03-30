import { z } from 'zod';

/** 리뷰 작성/수정 폼 검증 스키마 */
export const reviewSchema = z.object({
  rating: z
    .number({ error: 'Please select a rating' })
    .int()
    .min(1, 'Please select a rating')
    .max(5),
  content: z
    .string()
    .trim()
    .min(1, 'Please enter a review')
    .max(2000, 'Review must be 2000 characters or less'),
  visitedAt: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      { message: 'Visit date cannot be in the future' },
    ),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;
