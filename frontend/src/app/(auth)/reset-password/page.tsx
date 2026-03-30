import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from './_components/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset Password | HiddenBar',
};

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
