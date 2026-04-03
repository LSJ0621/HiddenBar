'use client';

import { UseFormReturn } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ProfileImageUploader } from './profile-image-uploader';
import { UpdateProfileValues } from './profile-edit-schema';

/** 프로필 기본 정보 폼 컴포넌트의 props */
interface ProfileBasicInfoFormProps {
  /** react-hook-form 인스턴스 */
  form: UseFormReturn<UpdateProfileValues>;
  /** 현재 프로필 이미지 URL */
  currentImageUrl: string | null;
  /** 이미지 파일 선택 시 호출되는 핸들러 */
  onImageSelect: (file: File) => Promise<void>;
  /** 이미지 업로드 진행 여부 */
  isUploading: boolean;
  /** 폼 제출 핸들러 */
  onSubmit: (values: UpdateProfileValues) => Promise<void>;
}

/**
 * 프로필 이름 및 이미지 수정 카드 섹션 컴포넌트
 */
export function ProfileBasicInfoForm({
  form,
  currentImageUrl,
  onImageSelect,
  isUploading,
  onSubmit,
}: ProfileBasicInfoFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Info</CardTitle>
        <CardDescription>You can change your name and profile image</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <fieldset disabled={form.formState.isSubmitting} className="space-y-4 disabled:opacity-60">
              <ProfileImageUploader
                currentImageUrl={currentImageUrl}
                onFileSelect={onImageSelect}
                isUploading={isUploading}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="profile-name-input"
                        placeholder="Enter your name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                data-testid="profile-save-button"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Save
              </Button>
            </fieldset>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
