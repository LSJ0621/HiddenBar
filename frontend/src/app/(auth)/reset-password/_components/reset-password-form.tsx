'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/error-utils';

import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useEmailVerification } from '@/hooks/use-email-verification';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { EmailVerificationSteps } from '@/components/auth/email-verification-steps';

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .max(50, 'Must be 50 characters or less')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Must contain lowercase, uppercase letters and numbers',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

/** Reset password form with 3-step email verification flow */
export function ResetPasswordForm() {
  const router = useRouter();

  const {
    step,
    email,
    verificationToken,
    isSending,
    isVerifying,
    sendCode,
    verifyCode,
    resendCode,
  } = useEmailVerification('RESET_PASSWORD');

  const passwordForm = useForm<PasswordFormValues>({
    resolver: standardSchemaResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        verificationToken: verificationToken!,
        newPassword: values.password,
      });
      toast.success('Your password has been reset');
      router.push('/login');
    } catch (error) {
      showErrorToast(error, 'Failed to reset password. Please try again.');
    }
  };

  const descriptionByStep = {
    email: 'Enter your registered email',
    code: 'Enter the verification code',
    done: 'Enter your new password',
  };

  return (
    <Card className="border-border/50 bg-card/80 shadow-2xl backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Reset Password</CardTitle>
        <CardDescription>{descriptionByStep[step]}</CardDescription>
      </CardHeader>

      <CardContent>
        <EmailVerificationSteps
          step={step}
          onSendCode={sendCode}
          onVerifyCode={verifyCode}
          onResend={resendCode}
          email={email}
          isSending={isSending}
          isVerifying={isVerifying}
          testIdPrefix="reset"
        />

        {/* Step 3: New Password */}
        {step === 'done' && (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="grid gap-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <PasswordInput
                          placeholder="8+ chars, lowercase, uppercase & numbers"
                          className="bg-background/50 pl-10"
                          data-testid="reset-password-input"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <PasswordInput
                          placeholder="Re-enter your password"
                          className="bg-background/50 pl-10"
                          data-testid="reset-confirm-password-input"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={passwordForm.formState.isSubmitting}
                data-testid="reset-submit-button"
              >
                {passwordForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Reset Password
              </Button>
            </form>
          </Form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to Log In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
