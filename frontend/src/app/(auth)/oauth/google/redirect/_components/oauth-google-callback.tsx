'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { setUser } from '@/store/auth-slice';
import type { AppDispatch } from '@/store';
import type { GoogleAuthResponse } from '@/types';

/** Handles the Google OAuth redirect callback */
export function OAuthGoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Google authentication was cancelled.');
      router.replace('/login');
      return;
    }

    if (!code) {
      toast.error('Google authentication code is missing.');
      router.replace('/login');
      return;
    }

    const savedState = sessionStorage.getItem('oauth_state');
    if (!state || state !== savedState) {
      toast.error('Invalid authentication request. Please try again.');
      router.replace('/login');
      return;
    }

    sessionStorage.removeItem('oauth_state');

    api
      .post<GoogleAuthResponse>(API_ENDPOINTS.AUTH.GOOGLE, { code })
      .then(({ data }) => {
        dispatch(setUser(data.user));
        router.replace('/');
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 403) {
          toast.error('Your account has been suspended. Please contact an administrator.');
        } else {
          toast.error('Google authentication failed.');
        }
        router.replace('/login');
      });
  }, [searchParams, dispatch, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Signing in with Google...</p>
    </div>
  );
}
