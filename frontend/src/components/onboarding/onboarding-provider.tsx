'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import {
  ONBOARDING_STEPS,
  type OnboardingEvent,
  type StepDefinition,
} from './onboarding-steps';
import { OnboardingOverlay, OnboardingTargetTracker } from './onboarding-overlay';
import { OnboardingTooltip } from './onboarding-tooltip';
import { OnboardingDialog } from './onboarding-dialog';
import {
  restoreState,
  persistState,
  clearPersistedState,
  isCompleted,
  markCompleted,
  clearCompleted,
  matchesPage,
} from './onboarding-storage';
import {
  advanceStep,
  initialState,
} from './onboarding-state-machine';

// OnboardingPhase와 OnboardingState는 state-machine에서 정의되며,
// 기존 소비자 코드의 호환성을 위해 여기서 재내보낸다
export type { OnboardingPhase, OnboardingState } from './onboarding-state-machine';
import type { OnboardingState } from './onboarding-state-machine';


/** 온보딩 Context 값 */
export interface OnboardingContextValue {
  state: OnboardingState;
  currentStepDef: StepDefinition | null;
  next: () => void;
  goToStep: (step: number) => void;
  endTour: () => void;
  startTour: () => void;
  skipTour: () => void;
  replayTour: () => void;
  notifyEvent: (event: OnboardingEvent) => void;
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(
  null,
);

/**
 * 온보딩 가이드 Provider
 * @description 인터랙티브 온보딩 가이드의 상태 머신과 렌더링을 관리
 */
export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<OnboardingState>(initialState);
  const pathname = usePathname();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initializedRef = useRef(false);

  // 초기화: sessionStorage 복원 또는 welcome 표시
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (isCompleted()) return;

    const restored = restoreState(pathname);
    if (restored && restored.phase !== 'idle') {
      setState({
        phase: restored.phase,
        currentStep: restored.currentStep,
        targetRect: null,
      });
      return;
    }

    if (isAuthenticated && pathname === '/search') {
      setState({ phase: 'welcome', currentStep: 0, targetRect: null });
    }
  }, [isAuthenticated, pathname]);

  // 인증 + /search 첫 진입 감지 (세션 복원 이후)
  useEffect(() => {
    if (!initializedRef.current) return;
    if (state.phase !== 'idle') return;
    if (isCompleted()) return;

    if (isAuthenticated && pathname === '/search') {
      const restored = restoreState(pathname);
      if (!restored) {
        setState({ phase: 'welcome', currentStep: 0, targetRect: null });
      }
    }
  }, [isAuthenticated, pathname, state.phase]);

  // pathname 변경 감지 → navigation 이벤트 자동 발행 또는 이탈 감지
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (state.phase === 'active') {
        const stepDef = ONBOARDING_STEPS[state.currentStep];
        if (stepDef?.waitFor === 'navigation') {
          // waitFor:navigation 스텝 → 자동 진행
          setState(advanceStep);
        } else if (stepDef) {
          // 현재 스텝 page 또는 다음 스텝 page와 매칭되지 않으면 이탈로 판단
          const currentPageMatch = matchesPage(pathname, stepDef.page);
          const nextStepDef = ONBOARDING_STEPS[state.currentStep + 1];
          const nextPageMatch = nextStepDef
            ? matchesPage(pathname, nextStepDef.page)
            : false;

          if (!currentPageMatch && !nextPageMatch) {
            clearPersistedState();
            setState(initialState);
          }
        }
      }
    }
  }, [pathname, state.phase, state.currentStep]);

  // waitFor: 'click' 스텝에서 target 클릭 감지 → 자동 진행
  useEffect(() => {
    if (state.phase !== 'active') return;
    const stepDef = ONBOARDING_STEPS[state.currentStep];
    if (!stepDef || stepDef.waitFor !== 'click') return;

    const handleClick = (e: MouseEvent) => {
      const target = document.querySelector(stepDef.target);
      if (target && (target === e.target || target.contains(e.target as Node))) {
        // 약간의 지연으로 원래 클릭 핸들러가 먼저 실행되도록 함
        setTimeout(() => {
          setState(advanceStep);
        }, 100);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [state.phase, state.currentStep]);

  const currentStepDef =
    state.phase === 'active' ? (ONBOARDING_STEPS[state.currentStep] ?? null) : null;

  /** 다음 스텝으로 이동 */
  const next = useCallback(() => {
    setState(advanceStep);
  }, []);

  /** 특정 스텝으로 이동 (검색 결과 0건 등 분기 처리용) */
  const goToStep = useCallback((step: number) => {
    if (step < 0 || step >= ONBOARDING_STEPS.length) return;
    persistState('active', step);
    setState({ phase: 'active', currentStep: step, targetRect: null });
  }, []);

  /** 투어 종료 */
  const endTour = useCallback(() => {
    markCompleted();
    clearPersistedState();
    setState(initialState);
  }, []);

  /** 투어 시작 (welcome → active) */
  const startTour = useCallback(() => {
    persistState('active', 0);
    setState({ phase: 'active', currentStep: 0, targetRect: null });
  }, []);

  /** 투어 스킵 */
  const skipTour = useCallback(() => {
    markCompleted();
    clearPersistedState();
    setState(initialState);
  }, []);

  /** 투어 재시작 (프로필에서 Replay Tour) */
  const replayTour = useCallback(() => {
    clearCompleted();
    clearPersistedState();
    setState({ phase: 'welcome', currentStep: 0, targetRect: null });
    persistState('welcome', 0);
  }, []);

  /** targetRect 업데이트 */
  const setTargetRect = useCallback((rect: DOMRect | null) => {
    setState((prev) => ({ ...prev, targetRect: rect }));
  }, []);

  /** 이벤트 알림 처리 */
  const notifyEvent = useCallback(
    (event: OnboardingEvent) => {
      setState((prev) => {
        if (prev.phase !== 'active') return prev;
        const stepDef = ONBOARDING_STEPS[prev.currentStep];
        if (!stepDef) return prev;

        const shouldAdvance = stepDef.waitFor === event.type;

        if (!shouldAdvance) return prev;

        return advanceStep(prev);
      });
    },
    [],
  );

  // 현재 페이지와 스텝 페이지 불일치 시 오버레이/툴팁 숨김 여부
  const isStepVisible =
    state.phase === 'active' &&
    currentStepDef != null &&
    matchesPage(pathname, currentStepDef.page);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      currentStepDef,
      next,
      goToStep,
      endTour,
      startTour,
      skipTour,
      replayTour,
      notifyEvent,
    }),
    [state, currentStepDef, next, goToStep, endTour, startTour, skipTour, replayTour, notifyEvent],
  );

  const showOverlay = isStepVisible && !currentStepDef?.skipOverlay;
  const showTooltipOnly = isStepVisible && currentStepDef?.skipOverlay;

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {state.phase === 'welcome' && <OnboardingDialog type="welcome" />}
      {state.phase === 'complete' && <OnboardingDialog type="complete" />}
      {showOverlay && currentStepDef && (
        <>
          <OnboardingOverlay
            target={currentStepDef.target}
            onRectChange={setTargetRect}
          />
          {state.targetRect && (
            <OnboardingTooltip
              step={currentStepDef}
              stepIndex={state.currentStep}
              targetRect={state.targetRect}
            />
          )}
        </>
      )}
      {showTooltipOnly && currentStepDef && (
        <>
          <OnboardingTargetTracker
            target={currentStepDef.target}
            onRectChange={setTargetRect}
          />
          {state.targetRect && (
            <OnboardingTooltip
              step={currentStepDef}
              stepIndex={state.currentStep}
              targetRect={state.targetRect}
            />
          )}
        </>
      )}
    </OnboardingContext.Provider>
  );
}
