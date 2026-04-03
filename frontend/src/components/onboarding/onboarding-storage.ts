import {
  ONBOARDING_COMPLETED_KEY,
  ONBOARDING_STATE_KEY,
  ONBOARDING_STEPS,
} from './onboarding-steps';
import type { OnboardingPhase } from './onboarding-state-machine';

/** sessionStorage에 저장할 상태 */
export interface PersistedState {
  phase: OnboardingPhase;
  currentStep: number;
}

/**
 * 현재 경로가 스텝 페이지에 해당하는지 확인한다
 * @param pathname 현재 URL 경로
 * @param page 스텝에 정의된 페이지 경로
 */
export function matchesPage(pathname: string, page: string): boolean {
  if (page === '/bars/[id]') {
    return /^\/bars\/[^/]+$/.test(pathname);
  }
  return pathname === page;
}

/**
 * sessionStorage에서 온보딩 상태를 복원한다
 * pathname 기반으로 저장된 스텝의 페이지와 불일치하면 복원을 거부하고 스토리지를 삭제한다
 * @param pathname 현재 URL 경로
 */
export function restoreState(pathname: string): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed.phase || typeof parsed.currentStep !== 'number') return null;

    // 저장된 스텝의 page와 현재 pathname이 매칭되지 않으면 복원 거부
    const stepDef = ONBOARDING_STEPS[parsed.currentStep];
    if (stepDef && !matchesPage(pathname, stepDef.page)) {
      sessionStorage.removeItem(ONBOARDING_STATE_KEY);
      return null;
    }

    return { phase: parsed.phase, currentStep: parsed.currentStep };
  } catch {
    /* 무시 */
  }
  return null;
}

/**
 * 현재 온보딩 상태를 sessionStorage에 저장한다
 * @param phase 현재 온보딩 단계
 * @param currentStep 현재 스텝 인덱스
 */
export function persistState(phase: OnboardingPhase, currentStep: number) {
  try {
    sessionStorage.setItem(
      ONBOARDING_STATE_KEY,
      JSON.stringify({ phase, currentStep }),
    );
  } catch {
    /* 무시 */
  }
}

/**
 * sessionStorage에서 온보딩 상태를 삭제한다
 */
export function clearPersistedState() {
  try {
    sessionStorage.removeItem(ONBOARDING_STATE_KEY);
  } catch {
    /* 무시 */
  }
}

/**
 * localStorage에서 온보딩 완료 여부를 반환한다
 */
export function isCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * localStorage에 온보딩 완료 플래그를 설정한다
 */
export function markCompleted() {
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch {
    /* 무시 */
  }
}

/**
 * localStorage에서 온보딩 완료 플래그를 제거한다 (재시작용)
 */
export function clearCompleted() {
  try {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch {
    /* 무시 */
  }
}
