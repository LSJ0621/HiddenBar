import { ONBOARDING_STEPS } from './onboarding-steps';
import { persistState } from './onboarding-storage';

/** 온보딩 상태 단계 */
export type OnboardingPhase = 'idle' | 'welcome' | 'active' | 'complete';

/** 온보딩 상태 */
export interface OnboardingState {
  phase: OnboardingPhase;
  currentStep: number;
  targetRect: DOMRect | null;
}

/**
 * 온보딩 초기 상태
 */
export const initialState: OnboardingState = {
  phase: 'idle',
  currentStep: 0,
  targetRect: null,
};

/**
 * 다음 스텝으로 진행하는 상태 전이 함수
 * active 단계가 아니면 상태를 그대로 반환한다
 * 마지막 스텝 이후에는 complete 단계로 전환한다
 * @param prev 이전 온보딩 상태
 */
export function advanceStep(prev: OnboardingState): OnboardingState {
  if (prev.phase !== 'active') return prev;
  const nextStep = prev.currentStep + 1;
  if (nextStep >= ONBOARDING_STEPS.length) {
    persistState('complete', prev.currentStep);
    return { phase: 'complete', currentStep: prev.currentStep, targetRect: null };
  }
  persistState('active', nextStep);
  return { phase: 'active', currentStep: nextStep, targetRect: null };
}
