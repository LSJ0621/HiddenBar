'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { EmailVerificationPurpose } from '@/types';

type VerificationStep = 'email' | 'code' | 'done';

/** Shared hook for email verification flow (send code → verify code) */
export function useEmailVerification(purpose: EmailVerificationPurpose) {
  const [step, setStep] = useState<VerificationStep>('email');
  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleError = (error: unknown): string => {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 404) return 'No account found with this email.';
      if (status === 409) return 'This email is already registered';
      if (status === 403) return message ?? 'This action is not allowed.';
      if (status === 400 && message) return message;
    }
    return 'An error occurred. Please try again.';
  };

  /** Send verification code to the given email */
  const sendCode = useCallback(
    async (targetEmail: string): Promise<string | null> => {
      setIsSending(true);
      try {
        await api.post(API_ENDPOINTS.AUTH.SEND_CODE, {
          email: targetEmail,
          purpose,
        });
        setEmail(targetEmail);
        setStep('code');
        toast.success('Verification code sent');
        return null;
      } catch (error) {
        return handleError(error);
      } finally {
        setIsSending(false);
      }
    },
    [purpose],
  );

  /** Verify the code entered by the user */
  const verifyCode = useCallback(
    async (code: string): Promise<string | null> => {
      setIsVerifying(true);
      try {
        const { data } = await api.post<{ verificationToken: string }>(
          API_ENDPOINTS.AUTH.VERIFY_CODE,
          { email, code, purpose },
        );
        setVerificationToken(data.verificationToken);
        setStep('done');
        return null;
      } catch (error) {
        return handleError(error);
      } finally {
        setIsVerifying(false);
      }
    },
    [email, purpose],
  );

  /** Resend verification code to the stored email */
  const resendCode = useCallback(async () => {
    setIsSending(true);
    try {
      await api.post(API_ENDPOINTS.AUTH.SEND_CODE, { email, purpose });
      toast.success('Verification code resent');
    } catch {
      toast.error('Failed to send verification code. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [email, purpose]);

  /** Reset to initial state */
  const reset = useCallback(() => {
    setStep('email');
    setEmail('');
    setVerificationToken(null);
  }, []);

  return {
    step,
    email,
    verificationToken,
    isSending,
    isVerifying,
    sendCode,
    verifyCode,
    resendCode,
    reset,
  };
}
