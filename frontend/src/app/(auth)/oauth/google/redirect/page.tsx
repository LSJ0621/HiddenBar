import { Suspense } from 'react';
import { OAuthGoogleCallback } from './_components/oauth-google-callback';

export default function OAuthGoogleRedirectPage() {
  return (
    <Suspense>
      <OAuthGoogleCallback />
    </Suspense>
  );
}
