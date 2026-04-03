'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Mail, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

type EmailFormValues = z.infer<typeof emailSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;

interface EmailVerificationStepsProps {
  /** 현재 단계 */
  step: 'email' | 'code' | 'done';
  /** 이메일 입력 후 코드 전송 */
  onSendCode: (email: string) => Promise<string | null>;
  /** 인증 코드 검증 */
  onVerifyCode: (code: string) => Promise<string | null>;
  /** 인증 코드 재전송 */
  onResend: () => Promise<void>;
  /** 이메일 주소 (코드 단계에서 표시) */
  email: string;
  /** 코드 전송 중 */
  isSending: boolean;
  /** 코드 검증 중 */
  isVerifying: boolean;
  /** data-testid 접두사 (예: 'signup', 'reset') */
  testIdPrefix: string;
}

/**
 * 이메일 인증 2단계(이메일 입력 → 코드 인증 + 재전송 Dialog) 공통 UI.
 * signup-form과 reset-password-form에서 공유한다.
 */
export function EmailVerificationSteps({
  step,
  onSendCode,
  onVerifyCode,
  onResend,
  email,
  isSending,
  isVerifying,
  testIdPrefix,
}: EmailVerificationStepsProps) {
  const [resendDialogOpen, setResendDialogOpen] = useState(false);

  const emailForm = useForm<EmailFormValues>({
    resolver: standardSchemaResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const codeForm = useForm<CodeFormValues>({
    resolver: standardSchemaResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const handleEmailSubmit = async (values: EmailFormValues) => {
    const error = await onSendCode(values.email);
    if (error) {
      emailForm.setError('email', { message: error });
    }
  };

  const handleCodeSubmit = async (values: CodeFormValues) => {
    const error = await onVerifyCode(values.code);
    if (error) {
      codeForm.setError('code', { message: error });
    }
  };

  const handleResend = async () => {
    await onResend();
    setResendDialogOpen(false);
  };

  return (
    <>
      {/* Step 1: Email */}
      {step === 'email' && (
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="grid gap-4">
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
                        data-testid={`${testIdPrefix}-email-input`}
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
              data-testid={`${testIdPrefix}-send-code-button`}
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
          <form onSubmit={codeForm.handleSubmit(handleCodeSubmit)} className="grid gap-4">
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
                      data-testid={`${testIdPrefix}-code-input`}
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
              data-testid={`${testIdPrefix}-verify-code-button`}
            >
              {isVerifying ? <Loader2 className="size-4 animate-spin" /> : null}
              Verify
            </Button>
            <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-center text-sm font-medium text-primary hover:underline"
                  data-testid={`${testIdPrefix}-resend-button`}
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
    </>
  );
}
