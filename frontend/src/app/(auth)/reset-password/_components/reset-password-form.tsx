'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useEmailVerification } from '@/hooks/use-email-verification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const emailSchema = z.object({
  email: z.email('Please enter a valid email'),
});

const codeSchema = z.object({
  code: z
    .string()
    .length(6, 'Please enter a 6-digit code')
    .regex(/^\d+$/, 'Numbers only'),
});

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

type EmailFormValues = z.infer<typeof emailSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

/** Reset password form with 3-step email verification flow */
export function ResetPasswordForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);

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

  const emailForm = useForm<EmailFormValues>({
    resolver: standardSchemaResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const codeForm = useForm<CodeFormValues>({
    resolver: standardSchemaResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: standardSchemaResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onEmailSubmit = async (values: EmailFormValues) => {
    const error = await sendCode(values.email);
    if (error) {
      emailForm.setError('email', { message: error });
    }
  };

  const onCodeSubmit = async (values: CodeFormValues) => {
    const error = await verifyCode(values.code);
    if (error) {
      codeForm.setError('code', { message: error });
    }
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        verificationToken: verificationToken!,
        newPassword: values.password,
      });
      toast.success('Your password has been reset');
      router.push('/login');
    } catch (error) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.message;
        toast.error(message ?? 'Failed to reset password. Please try again.');
      } else {
        toast.error('Failed to reset password. Please try again.');
      }
    }
  };

  const handleResend = async () => {
    await resendCode();
    setResendDialogOpen(false);
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
        {/* Step 1: Email */}
        {step === 'email' && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="grid gap-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="bg-background/50 pl-10"
                          data-testid="reset-email-input"
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
                disabled={isSending}
                data-testid="reset-send-code-button"
              >
                {isSending ? <Loader2 className="size-4 animate-spin" /> : null}
                Send Verification Code
              </Button>
            </form>
          </Form>
        )}

        {/* Step 2: Code verification */}
        {step === 'code' && (
          <Form {...codeForm}>
            <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                Enter the verification code sent to {email}
              </p>
              <FormField
                control={codeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6-digit code"
                        className="bg-background/50"
                        data-testid="reset-code-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isVerifying}
                data-testid="reset-verify-code-button"
              >
                {isVerifying ? <Loader2 className="size-4 animate-spin" /> : null}
                Verify
              </Button>
              <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-center text-sm font-medium text-primary hover:underline"
                    data-testid="reset-resend-button"
                  >
                    Resend Verification Code
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Resend Verification Code</DialogTitle>
                    <DialogDescription>
                      Would you like to resend the verification code?{'\n'}The previous code will be invalidated.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleResend} disabled={isSending}>
                      {isSending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Resend
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </form>
          </Form>
        )}

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
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="8+ chars, lowercase, uppercase & numbers"
                          className="bg-background/50 pl-10 pr-10"
                          data-testid="reset-password-input"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
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
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          className="bg-background/50 pl-10 pr-10"
                          data-testid="reset-confirm-password-input"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
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
