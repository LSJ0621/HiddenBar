'use client';

import { useContext } from 'react';
import { OnboardingContext, type OnboardingContextValue } from './onboarding-provider';

/**
 * 온보딩 Context 소비 훅
 * @returns OnboardingContextValue
 * @throws OnboardingProvider 바깥에서 호출 시 에러
 */
export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}
