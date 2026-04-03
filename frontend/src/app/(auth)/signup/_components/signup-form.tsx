'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { User, Lock, Loader2 } from 'lucide-react';
import { showErrorToast } from '@/lib/error-utils';
import { useAuthStore } from '@/hooks/use-auth';
import { getSafeRedirect } from '@/lib/validate-redirect';
import { useEmailVerification } from '@/hooks/use-email-verification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { SocialLoginButtons } from '@/components/auth/social-login-buttons';
import { EmailVerificationSteps } from '@/components/auth/email-verification-steps';

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

type ProfileFormValues = z.infer<typeof profileSchema>;

/** Signup form with 3-step email verification flow */
export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useAuthStore();

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

  const profileForm = useForm<ProfileFormValues>({
    resolver: standardSchemaResolver(profileSchema),
    defaultValues: { name: '', password: '' },
  });

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
      showErrorToast(error, 'Sign up failed. Please try again.');
    }
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
        <EmailVerificationSteps
          step={step}
          onSendCode={sendCode}
          onVerifyCode={verifyCode}
          onResend={resendCode}
          email={email}
          isSending={isSending}
          isVerifying={isVerifying}
          testIdPrefix="signup"
        />

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
                        <PasswordInput
                          placeholder="8+ chars, lowercase, uppercase & numbers"
                          className="bg-background/50 pl-10"
                          data-testid="signup-password-input"
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
