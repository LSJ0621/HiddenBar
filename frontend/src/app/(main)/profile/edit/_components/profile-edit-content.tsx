'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { showErrorToast } from '@/lib/error-utils';
import {
  useProfile,
  useUpdateProfile,
  useChangePassword,
  useUploadProfileImage,
} from '@/hooks/queries/use-profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { updateProfileSchema, changePasswordSchema, UpdateProfileValues, ChangePasswordValues } from './profile-edit-schema';
import { ProfileBasicInfoForm } from './profile-basic-info-form';
import { ProfileChangePasswordForm } from './profile-change-password-form';

/**
 * 프로필 수정 페이지의 메인 컨텐츠 컴포넌트.
 * 로딩 상태 처리, 데이터 페칭, 기본 정보/비밀번호 변경 섹션 조합을 담당한다.
 */
export function ProfileEditContent() {
  const router = useRouter();
  const { data: user, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const uploadProfileImage = useUploadProfileImage();

  const profileForm = useForm<UpdateProfileValues>({
    resolver: standardSchemaResolver(updateProfileSchema),
    values: {
      name: user?.name ?? '',
    },
  });

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: standardSchemaResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  /** 프로필 이미지 선택 시 업로드를 처리하는 핸들러 */
  const handleImageSelect = async (file: File) => {
    try {
      await uploadProfileImage.mutateAsync(file);
      toast.success('Profile image updated');
    } catch (error) {
      showErrorToast(error, 'Failed to upload image');
    }
  };

  /** 프로필 기본 정보 폼 제출 핸들러 */
  const onProfileSubmit = async (values: UpdateProfileValues) => {
    try {
      await updateProfile.mutateAsync({ name: values.name });
      toast.success('Profile updated');
      router.push('/profile');
    } catch (error) {
      showErrorToast(error, 'Failed to update profile');
    }
  };

  /** 비밀번호 변경 폼 제출 핸들러 */
  const onPasswordSubmit = async (values: ChangePasswordValues) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed');
      passwordForm.reset();
    } catch (error) {
      showErrorToast(error, 'Failed to change password');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-lg space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="mx-auto size-24 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto max-w-lg space-y-6 px-4 py-8">
      {/* 뒤로 가기 버튼이 포함된 헤더 */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/profile')}
          aria-label="Go back"
          data-testid="profile-back-button"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="font-display text-xl font-semibold tracking-tight">Edit Profile</h1>
      </div>

      <ProfileBasicInfoForm
        form={profileForm}
        currentImageUrl={user.profileImage}
        onImageSelect={handleImageSelect}
        isUploading={uploadProfileImage.isPending}
        onSubmit={onProfileSubmit}
      />

      {/* OAuth 등 비밀번호가 없는 사용자에게는 숨김 */}
      {user.hasPassword && (
        <ProfileChangePasswordForm
          form={passwordForm}
          onSubmit={onPasswordSubmit}
        />
      )}
    </div>
  );
}
