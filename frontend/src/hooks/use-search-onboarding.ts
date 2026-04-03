'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ONBOARDING_STEPS, type OnboardingEvent } from '@/components/onboarding/onboarding-steps';
import type { LatLng } from '@/types';

type OnboardingState = {
  phase: string;
  currentStep: number;
};

type UseSearchOnboardingParams = {
  /** 온보딩 상태 객체 */
  onboardingState: OnboardingState;
  /** 현재 활성 탭 */
  tab: string;
  /** 지도 핀 좌표 */
  mapPin: LatLng | null;
  /** 탭 변경 함수 */
  setTab: (tab: string) => void;
  /** 특정 스텝으로 이동하는 함수 */
  goToStep: (step: number) => void;
  /** 온보딩 이벤트 알림 함수 */
  notifyEvent: (event: OnboardingEvent) => void;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 검색 결과 존재 여부 */
  hasResults: boolean;
  /** 검색 결과 건수 */
  barsLength: number;
};

/**
 * 검색 페이지의 온보딩 관련 사이드 이펙트를 모아둔 훅.
 * - Step 0~3: forceTab으로 탭 강제 전환
 * - Step 4: mapPin 변경 감지 → notifyEvent
 * - Step 6: 검색 결과 0건 시 Step 4로 되돌림
 */
export function useSearchOnboarding({
  onboardingState,
  tab,
  mapPin,
  setTab,
  goToStep,
  notifyEvent,
  isLoading,
  hasResults,
  barsLength,
}: UseSearchOnboardingParams) {
  const isOnboardingTabStep =
    onboardingState.phase === 'active' &&
    onboardingState.currentStep <= 3;

  /** 온보딩 Step 0~3: forceTab으로 탭 강제 전환 */
  useEffect(() => {
    if (!isOnboardingTabStep) return;
    const stepDef = ONBOARDING_STEPS[onboardingState.currentStep];
    if (stepDef?.forceTab && stepDef.forceTab !== tab) {
      setTab(stepDef.forceTab);
    }
  }, [isOnboardingTabStep, onboardingState.currentStep, tab, setTab]);

  /** 온보딩 Step 4: mapPin 변경 감지 → notifyEvent */
  const prevMapPinRef = useRef(mapPin);
  useEffect(() => {
    if (
      onboardingState.phase === 'active' &&
      onboardingState.currentStep === 4 &&
      mapPin &&
      !prevMapPinRef.current
    ) {
      notifyEvent({ type: 'mapPin' });
    }
    prevMapPinRef.current = mapPin;
  }, [mapPin, onboardingState.phase, onboardingState.currentStep, notifyEvent]);

  /** 온보딩 Step 6: 검색 결과 0건 시 Step 4(맵 핀)로 되돌림 */
  useEffect(() => {
    if (
      onboardingState.phase === 'active' &&
      onboardingState.currentStep === 6 &&
      !isLoading &&
      hasResults &&
      barsLength === 0
    ) {
      toast.info('No results found. Try searching a different area.');
      goToStep(4);
    }
  }, [onboardingState.phase, onboardingState.currentStep, isLoading, hasResults, barsLength, goToStep]);

  return { isOnboardingTabStep };
}
