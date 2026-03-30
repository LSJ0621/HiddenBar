'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

import { AxiosError } from 'axios';

import { useAuthStore } from '@/hooks/use-auth';
import { getSafeRedirect } from '@/lib/validate-redirect';
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
import { SocialLoginButtons } from '@/components/auth/social-login-buttons';

const loginSchema = z.object({
  email: z.email('Please enter a valid email'),
  password: z.string().min(1, 'Please enter your password'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/** Login form with email/password and Google OAuth */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
      router.push(getSafeRedirect(searchParams.get('redirect')));
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const message = error.response?.data?.message;

        if (status === 401) {
          form.setError('root', {
            message: 'Invalid email or password.',
          });
        } else if (status === 403) {
          form.setError('root', {
            message: 'Your account has been suspended. Please contact an administrator.',
          });
        } else {
          form.setError('root', {
            message: message ?? 'Login failed. Please try again.',
          });
        }
      } else {
        form.setError('root', {
          message: 'Login failed. Please try again.',
        });
      }
    }
  };

  // bg-card/80 + backdrop-blur: 글래스모피즘 효과 — 인증 페이지 배경 이미지 위에 반투명 카드
  return (
    <Card className="border-border/50 bg-card/80 shadow-2xl backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Log In</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            {/* Email */}
            <FormField
              control={form.control}
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
                        data-testid="login-email-input"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        className="bg-background/50 pl-10 pr-10"
                        data-testid="login-password-input"
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

            {/* Root error */}
            {form.formState.errors.root && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                data-testid="auth-error-message"
              >
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={form.formState.isSubmitting}
              data-testid="login-submit-button"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Log In
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/reset-password" className="font-medium text-primary hover:underline">
            Forgot your password?
          </Link>
        </p>
        <SocialLoginButtons />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign Up
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Are you a bar owner?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up and register your bar
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
