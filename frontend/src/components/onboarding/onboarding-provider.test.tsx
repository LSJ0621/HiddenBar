import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  ONBOARDING_COMPLETED_KEY,
  ONBOARDING_STATE_KEY,
  ONBOARDING_STEPS,
} from './onboarding-steps';
import { OnboardingProvider } from './onboarding-provider';
import { useOnboarding } from './use-onboarding';

// next/navigation mock
let mockPathname = '/search';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// react-redux mock
let mockIsAuthenticated = true;
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: { isAuthenticated: mockIsAuthenticated, user: null } }),
}));

// 하위 컴포넌트 mock — Provider 테스트에서는 overlay/tooltip/dialog의 내부 구현이 아닌 렌더링 여부만 검증
jest.mock('./onboarding-overlay', () => ({
  OnboardingOverlay: ({ target }: { target: string }) => (
    <div data-testid="onboarding-overlay" data-target={target} />
  ),
  OnboardingTargetTracker: ({ target }: { target: string }) => (
    <div data-testid="onboarding-target-tracker" data-target={target} />
  ),
}));

jest.mock('./onboarding-tooltip', () => ({
  OnboardingTooltip: ({
    stepIndex,
  }: {
    stepIndex: number;
    step: unknown;
    targetRect: unknown;
  }) => <div data-testid="onboarding-tooltip" data-step={stepIndex} />,
}));

jest.mock('./onboarding-dialog', () => ({
  OnboardingDialog: ({ type }: { type: string }) => (
    <div data-testid={`onboarding-dialog-${type}`} />
  ),
}));

/** Context 값을 노출하는 테스트용 소비 컴포넌트 */
function TestConsumer() {
  const ctx = useOnboarding();
  return (
    <div>
      <span data-testid="phase">{ctx.state.phase}</span>
      <span data-testid="step">{ctx.state.currentStep}</span>
      <button data-testid="start" onClick={ctx.startTour}>
        start
      </button>
      <button data-testid="skip" onClick={ctx.skipTour}>
        skip
      </button>
      <button data-testid="next" onClick={ctx.next}>
        next
      </button>
      <button data-testid="end" onClick={ctx.endTour}>
        end
      </button>
      <button data-testid="replay" onClick={ctx.replayTour}>
        replay
      </button>
      <button data-testid="goToStep5" onClick={() => ctx.goToStep(5)}>
        goToStep5
      </button>
      <button data-testid="goToStep-invalid" onClick={() => ctx.goToStep(-1)}>
        goToStepInvalid
      </button>
      <button
        data-testid="notify-mapPin"
        onClick={() => ctx.notifyEvent({ type: 'mapPin' })}
      >
        mapPin
      </button>
      <button
        data-testid="notify-navigation"
        onClick={() =>
          ctx.notifyEvent({ type: 'navigation', pathname: '/bars/1' })
        }
      >
        navigation
      </button>
      <button
        data-testid="notify-click"
        onClick={() =>
          ctx.notifyEvent({ type: 'click', targetId: 'search-here-button' })
        }
      >
        click
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <OnboardingProvider>
      <TestConsumer />
    </OnboardingProvider>,
  );
}

describe('OnboardingProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/search';
    mockIsAuthenticated = true;
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('초기화', () => {
    it('should stay idle when onboarding-completed localStorage is set', () => {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      renderProvider();
      expect(screen.getByTestId('phase')).toHaveTextContent('idle');
    });

    it('should show welcome dialog when authenticated user enters /search', () => {
      renderProvider();
      expect(screen.getByTestId('phase')).toHaveTextContent('welcome');
      expect(screen.getByTestId('onboarding-dialog-welcome')).toBeInTheDocument();
    });

    it('should stay idle when user is not authenticated', () => {
      mockIsAuthenticated = false;
      renderProvider();
      expect(screen.getByTestId('phase')).toHaveTextContent('idle');
    });

    it('should stay idle when pathname is not /search', () => {
      mockPathname = '/bars/1';
      renderProvider();
      expect(screen.getByTestId('phase')).toHaveTextContent('idle');
    });
  });

  describe('Start Tour / Skip', () => {
    it('should transition to active(step=0) when startTour is called', async () => {
      const user = userEvent.setup();
      renderProvider();
      expect(screen.getByTestId('phase')).toHaveTextContent('welcome');

      await user.click(screen.getByTestId('start'));
      expect(screen.getByTestId('phase')).toHaveTextContent('active');
      expect(screen.getByTestId('step')).toHaveTextContent('0');
    });

    it('should transition to idle and set localStorage when skipTour is called', async () => {
      const user = userEvent.setup();
      renderProvider();

      await user.click(screen.getByTestId('skip'));
      expect(screen.getByTestId('phase')).toHaveTextContent('idle');
      expect(localStorage.getItem(ONBOARDING_COMPLETED_KEY)).toBe('true');
    });
  });

  describe('스텝 진행', () => {
    async function startTour() {
      const user = userEvent.setup();
      renderProvider();
      await user.click(screen.getByTestId('start'));
      return user;
    }

    it('should advance step when next() is called on waitFor=next step', async () => {
      const user = await startTour();
      // Step 0은 waitFor: 'next'
      expect(screen.getByTestId('step')).toHaveTextContent('0');

      await user.click(screen.getByTestId('next'));
      expect(screen.getByTestId('step')).toHaveTextContent('1');
    });

    it('should advance step on notifyEvent mapPin when step waitFor is mapPin', async () => {
      const user = await startTour();
      // Step 0~3: next, Step 4: mapPin
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByTestId('next'));
      }
      expect(screen.getByTestId('step')).toHaveTextContent('4');

      await user.click(screen.getByTestId('notify-mapPin'));
      expect(screen.getByTestId('step')).toHaveTextContent('5');
    });

    it('should advance step on notifyEvent navigation when step waitFor is navigation', async () => {
      const user = await startTour();
      // 진행: 0→1→2→3(next) → 4(mapPin) → 5(click) → step 6 (navigation)
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByTestId('next'));
      }
      await user.click(screen.getByTestId('notify-mapPin'));
      await user.click(screen.getByTestId('notify-click'));
      expect(screen.getByTestId('step')).toHaveTextContent('6');

      await user.click(screen.getByTestId('notify-navigation'));
      expect(screen.getByTestId('step')).toHaveTextContent('7');
    });

    it('should not advance when event type does not match step waitFor', async () => {
      const user = await startTour();
      // Step 0: waitFor=next, mapPin 이벤트는 무시
      await user.click(screen.getByTestId('notify-mapPin'));
      expect(screen.getByTestId('step')).toHaveTextContent('0');
    });
  });

  describe('End Tour', () => {
    it('should transition to idle and set localStorage when endTour is called', async () => {
      const user = userEvent.setup();
      renderProvider();
      await user.click(screen.getByTestId('start'));
      expect(screen.getByTestId('phase')).toHaveTextContent('active');

      await user.click(screen.getByTestId('end'));
      expect(screen.getByTestId('phase')).toHaveTextContent('idle');
      expect(localStorage.getItem(ONBOARDING_COMPLETED_KEY)).toBe('true');
    });
  });

  describe('Complete phase', () => {
    it('should transition to complete after last step', async () => {
      const user = userEvent.setup();
      renderProvider();
      await user.click(screen.getByTestId('start'));

      // 전체 스텝을 순차 진행
      for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
        const stepDef = ONBOARDING_STEPS[i];
        switch (stepDef.waitFor) {
          case 'next':
            await user.click(screen.getByTestId('next'));
            break;
          case 'mapPin':
            await user.click(screen.getByTestId('notify-mapPin'));
            break;
          case 'click':
            await user.click(screen.getByTestId('notify-click'));
            break;
          case 'navigation':
            await user.click(screen.getByTestId('notify-navigation'));
            break;
        }
      }

      expect(screen.getByTestId('phase')).toHaveTextContent('complete');
      expect(screen.getByTestId('onboarding-dialog-complete')).toBeInTheDocument();
    });
  });

  describe('sessionStorage 유지/복원', () => {
    it('should persist state to sessionStorage during active phase', async () => {
      const user = userEvent.setup();
      renderProvider();
      await user.click(screen.getByTestId('start'));

      const stored = JSON.parse(
        sessionStorage.getItem(ONBOARDING_STATE_KEY) ?? '{}',
      );
      expect(stored.phase).toBe('active');
      expect(stored.currentStep).toBe(0);
    });

    it('should restore state from sessionStorage on mount', () => {
      sessionStorage.setItem(
        ONBOARDING_STATE_KEY,
        JSON.stringify({ phase: 'active', currentStep: 3 }),
      );

      renderProvider();

      expect(screen.getByTestId('phase')).toHaveTextContent('active');
      expect(screen.getByTestId('step')).toHaveTextContent('3');
    });

    it('should clear sessionStorage when tour is ended', async () => {
      const user = userEvent.setup();
      renderProvider();
      await user.click(screen.getByTestId('start'));
      expect(sessionStorage.getItem(ONBOARDING_STATE_KEY)).not.toBeNull();

      await user.click(screen.getByTestId('end'));
      expect(sessionStorage.getItem(ONBOARDING_STATE_KEY)).toBeNull();
    });

    it('should reject sessionStorage restore when pathname does not match step page', () => {
      // Step 3의 page는 /search. pathname을 /bars/1로 설정하면 복원 거부
      mockPathname = '/bars/1';
      sessionStorage.setItem(
        ONBOARDING_STATE_KEY,
        JSON.stringify({ phase: 'active', currentStep: 3 }),
      );

      renderProvider();

      // 복원 거부 → idle 유지
      expect(screen.getByTestId('phase')).toHaveTextContent('idle');
      // sessionStorage도 클리어됨
      expect(sessionStorage.getItem(ONBOARDING_STATE_KEY)).toBeNull();
    });
  });

  describe('goToStep', () => {
    it('should jump to specified step when goToStep is called', async () => {
      const user = userEvent.setup();
      renderProvider();
      await user.click(screen.getByTestId('start'));
      expect(screen.getByTestId('step')).toHaveTextContent('0');

      await user.click(screen.getByTestId('goToStep5'));
      expect(screen.getByTestId('step')).toHaveTextContent('5');
      expect(screen.getByTestId('phase')).toHaveTextContent('active');
    });

    it('should ignore invalid step index', async () => {
      const user = userEvent.setup();
      renderProvider();
      await user.click(screen.getByTestId('start'));

      await user.click(screen.getByTestId('goToStep-invalid'));
      // 유효하지 않은 인덱스 → 변경 없음
      expect(screen.getByTestId('step')).toHaveTextContent('0');
    });
  });

  describe('skipOverlay 스텝', () => {
    it('should render OnboardingTargetTracker instead of overlay for skipOverlay step', async () => {
      // Step 8은 skipOverlay: true, page: /bars/[id]
      mockPathname = '/bars/1';
      sessionStorage.setItem(
        ONBOARDING_STATE_KEY,
        JSON.stringify({ phase: 'active', currentStep: 8 }),
      );

      renderProvider();

      expect(screen.getByTestId('phase')).toHaveTextContent('active');
      expect(screen.getByTestId('step')).toHaveTextContent('8');
      // skipOverlay → OnboardingTargetTracker 렌더, OnboardingOverlay 미렌더
      expect(screen.getByTestId('onboarding-target-tracker')).toBeInTheDocument();
      expect(screen.queryByTestId('onboarding-overlay')).not.toBeInTheDocument();
    });
  });
});
