'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { User, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import { useAuthStore } from '@/hooks/use-auth';
import { getSafeRedirect } from '@/lib/validate-redirect';
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
import { SocialLoginButtons } from '@/components/auth/social-login-buttons';

const emailSchema = z.object({
  email: z.email('Please enter a valid email'),
});

const codeSchema = z.object({
  code: z
    .string()
    .length(6, 'Please enter a 6-digit code')
    .regex(/^\d+$/, 'Numbers only'),
});

const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Must be at least 2 characters')
    .max(30, 'Must be 30 characters or less'),
  password: z
    .string()
    .min(8, 'Must be at least 8 characters')
    .max(50, 'Must be 50 characters or less')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Must contain lowercase, uppercase letters and numbers',
    ),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;

/** Signup form with 3-step email verification flow */
export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
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
  } = useEmailVerification('SIGNUP');

  const emailForm = useForm<EmailFormValues>({
    resolver: standardSchemaResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const codeForm = useForm<CodeFormValues>({
    resolver: standardSchemaResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: standardSchemaResolver(profileSchema),
    defaultValues: { name: '', password: '' },
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

  const onProfileSubmit = async (values: ProfileFormValues) => {
    try {
      await signup({
        email,
        password: values.password,
        name: values.name,
        verificationToken: verificationToken!,
      });
      router.push(getSafeRedirect(searchParams.get('redirect')));
    } catch (error) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.message;
        toast.error(message ?? 'Sign up failed. Please try again.');
      } else {
        toast.error('Sign up failed. Please try again.');
      }
    }
  };

  const handleResend = async () => {
    await resendCode();
    setResendDialogOpen(false);
  };

  const descriptionByStep = {
    email: 'Verify your email',
    code: 'Enter the verification code',
    done: 'Enter your information',
  };

  return (
    <Card className="border-border/50 bg-card/80 shadow-2xl backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Sign Up</CardTitle>
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
                          data-testid="signup-email-input"
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
                data-testid="signup-send-code-button"
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
                        data-testid="signup-code-input"
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
                data-testid="signup-verify-code-button"
              >
                {isVerifying ? <Loader2 className="size-4 animate-spin" /> : null}
                Verify
              </Button>
              <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-center text-sm font-medium text-primary hover:underline"
                    data-testid="signup-resend-button"
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

        {/* Step 3: Name & Password */}
        {step === 'done' && (
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="grid gap-4">
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Enter your name"
                          className="bg-background/50 pl-10"
                          data-testid="signup-name-input"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="8+ chars, lowercase, uppercase & numbers"
                          className="bg-background/50 pl-10 pr-10"
                          data-testid="signup-password-input"
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
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={profileForm.formState.isSubmitting}
                data-testid="signup-submit-button"
              >
                {profileForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Sign Up
              </Button>
            </form>
          </Form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <SocialLoginButtons />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
