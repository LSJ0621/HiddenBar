'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import {
  useProfile,
  useUpdateProfile,
  useChangePassword,
  useUploadProfileImage,
} from '@/hooks/queries/use-profile';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileImageUploader } from './profile-image-uploader';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(30, 'Name must be 30 characters or less'),
});

type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

const changePasswordSchema = z
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

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Profile edit page with profile info section and password change section */
export function ProfileEditContent() {
  const router = useRouter();
  const { data: user, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const uploadProfileImage = useUploadProfileImage();

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const profileForm = useForm<UpdateProfileValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: standardSchemaResolver(updateProfileSchema),
    values: {
      name: user?.name ?? '',
    },
  });

  const passwordForm = useForm<ChangePasswordValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: standardSchemaResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const handleImageSelect = async (file: File) => {
    try {
      await uploadProfileImage.mutateAsync(file);
      toast.success('Profile image updated');
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message ?? 'Failed to upload image');
      } else {
        toast.error('Failed to upload image');
      }
    }
  };

  const onProfileSubmit = async (values: UpdateProfileValues) => {
    try {
      await updateProfile.mutateAsync({ name: values.name });
      toast.success('Profile updated');
      router.push('/profile');
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message ?? 'Failed to update profile');
      } else {
        toast.error('Failed to update profile');
      }
    }
  };

  const onPasswordSubmit = async (values: ChangePasswordValues) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed');
      passwordForm.reset();
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message ?? 'Failed to change password');
      } else {
        toast.error('Failed to change password');
      }
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
      {/* Header with back button */}
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

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
          <CardDescription>You can change your name and profile image</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
              <fieldset disabled={profileForm.formState.isSubmitting} className="space-y-4 disabled:opacity-60">
                <ProfileImageUploader
                  currentImageUrl={user.profileImage}
                  onFileSelect={handleImageSelect}
                  isUploading={uploadProfileImage.isPending}
                />

                <FormField
                  control={profileForm.control}
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
                  disabled={profileForm.formState.isSubmitting}
                >
                  {profileForm.formState.isSubmitting && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Save
                </Button>
              </fieldset>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Password Section — hidden for OAuth users without password */}
      {user.hasPassword && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>You can set a new password</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <fieldset disabled={passwordForm.formState.isSubmitting} className="space-y-4 disabled:opacity-60">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPw ? 'text' : 'password'}
                              data-testid="password-current-input"
                              placeholder="Enter current password"
                              className="pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowCurrentPw((prev) => !prev)}
                              aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                            >
                              {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showNewPw ? 'text' : 'password'}
                              data-testid="password-new-input"
                              placeholder="Enter new password"
                              className="pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowNewPw((prev) => !prev)}
                              aria-label={showNewPw ? 'Hide password' : 'Show password'}
                            >
                              {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmNewPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPw ? 'text' : 'password'}
                              data-testid="password-confirm-input"
                              placeholder="Re-enter new password"
                              className="pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowConfirmPw((prev) => !prev)}
                              aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    data-testid="password-change-button"
                    disabled={passwordForm.formState.isSubmitting}
                  >
                    {passwordForm.formState.isSubmitting && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Change Password
                  </Button>
                </fieldset>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
