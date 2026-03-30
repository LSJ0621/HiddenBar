import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from './_components/login-form';

export const metadata: Metadata = {
  title: 'Login | Hidden Bar',
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
