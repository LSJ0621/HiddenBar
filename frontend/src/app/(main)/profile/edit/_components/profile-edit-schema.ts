import { z } from 'zod/v4';

/**
 * 프로필 기본 정보 수정 폼의 유효성 검사 스키마
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(30, 'Name must be 30 characters or less'),
});

/** 프로필 기본 정보 수정 폼의 타입 */
export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

/**
 * 비밀번호 변경 폼의 유효성 검사 스키마
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Please enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Must contain a letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

/** 비밀번호 변경 폼의 타입 */
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
