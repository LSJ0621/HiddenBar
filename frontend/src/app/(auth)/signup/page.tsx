import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SignupForm } from './_components/signup-form';

export const metadata: Metadata = {
  title: 'Sign Up | Hidden Bar',
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
