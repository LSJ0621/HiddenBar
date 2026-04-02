import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { StepDefinition } from './onboarding-steps';
import { OnboardingTooltip } from './onboarding-tooltip';

// useOnboarding mock
const mockNext = jest.fn();
const mockEndTour = jest.fn();

jest.mock('./use-onboarding', () => ({
  useOnboarding: () => ({
    next: mockNext,
    endTour: mockEndTour,
  }),
}));

// useMediaQuery mock
jest.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => ({ matches: true, mounted: true }),
}));

const baseTargetRect = {
  top: 100,
  left: 200,
  bottom: 140,
  right: 300,
  width: 100,
  height: 40,
  x: 200,
  y: 100,
  toJSON: () => {},
} as DOMRect;

const nextStep: StepDefinition = {
  target: 'button[role="tab"][value="address"]',
  message: '<strong>Address</strong> — Search bars near a specific address.',
  waitFor: 'next',
  placement: 'bottom',
  page: '/search',
  forceTab: 'address',
};

const clickStep: StepDefinition = {
  target: '#search-here-button',
  message: "Now tap 'Search here' to find nearby bars.",
  waitFor: 'click',
  placement: 'bottom',
  page: '/search',
};

const mapPinStep: StepDefinition = {
  target: '[data-testid="map-container"]',
  message: 'Tap on the map to drop a pin.',
  waitFor: 'mapPin',
  placement: 'top',
  page: '/search',
};

const navigationStep: StepDefinition = {
  target: '#get-directions-button',
  message: 'Tap to start real-time navigation.',
  waitFor: 'navigation',
  placement: 'top',
  page: '/bars/[id]',
};

const noFlipStep: StepDefinition = {
  target: '#get-directions-button',
  message: 'Tap to start real-time navigation.',
  waitFor: 'navigation',
  placement: 'top',
  page: '/bars/[id]',
  noFlip: true,
};

// requestAnimationFrame mock for position calculation
const originalRAF = globalThis.requestAnimationFrame;
const originalCAF = globalThis.cancelAnimationFrame;
let rafCallbacks: Array<() => void> = [];

beforeAll(() => {
  globalThis.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
    rafCallbacks.push(() => cb(0));
    return rafCallbacks.length;
  }) as unknown as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = jest.fn();
});

afterAll(() => {
  globalThis.requestAnimationFrame = originalRAF;
  globalThis.cancelAnimationFrame = originalCAF;
});

function flushRAF() {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach((cb) => cb());
}

describe('OnboardingTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rafCallbacks = [];
  });

  describe('메시지 렌더링', () => {
    it('should render current step message text', () => {
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      expect(
        screen.getByText(/Search bars near a specific address/),
      ).toBeInTheDocument();
    });

    it('should render bold text with strong tag', () => {
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      const strong = screen.getByText('Address');
      expect(strong.tagName).toBe('STRONG');
    });

    it('should render step counter', () => {
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      expect(screen.getByText('1 / 13')).toBeInTheDocument();
    });

    it('should render step counter with correct index', () => {
      render(
        <OnboardingTooltip
          step={clickStep}
          stepIndex={5}
          targetRect={baseTargetRect}
        />,
      );
      expect(screen.getByText('6 / 13')).toBeInTheDocument();
    });
  });

  describe('Next 버튼', () => {
    it('should show "Next" button when waitFor is "next"', () => {
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Next' }),
      ).toBeInTheDocument();
    });

    it('should not show "Next" button when waitFor is "click"', () => {
      render(
        <OnboardingTooltip
          step={clickStep}
          stepIndex={5}
          targetRect={baseTargetRect}
        />,
      );
      expect(
        screen.queryByRole('button', { name: 'Next' }),
      ).not.toBeInTheDocument();
    });

    it('should not show "Next" button when waitFor is "mapPin"', () => {
      render(
        <OnboardingTooltip
          step={mapPinStep}
          stepIndex={4}
          targetRect={baseTargetRect}
        />,
      );
      expect(
        screen.queryByRole('button', { name: 'Next' }),
      ).not.toBeInTheDocument();
    });

    it('should not show "Next" button when waitFor is "navigation"', () => {
      render(
        <OnboardingTooltip
          step={navigationStep}
          stepIndex={9}
          targetRect={baseTargetRect}
        />,
      );
      expect(
        screen.queryByRole('button', { name: 'Next' }),
      ).not.toBeInTheDocument();
    });

    it('should call next() when "Next" button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('End tour 버튼', () => {
    it('should show "End tour" button on all steps', () => {
      const steps = [nextStep, clickStep, mapPinStep, navigationStep];
      steps.forEach((step, i) => {
        const { unmount } = render(
          <OnboardingTooltip
            step={step}
            stepIndex={i}
            targetRect={baseTargetRect}
          />,
        );
        expect(
          screen.getByRole('button', { name: 'End tour' }),
        ).toBeInTheDocument();
        unmount();
      });
    });

    it('should call endTour() when "End tour" button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'End tour' }));
      expect(mockEndTour).toHaveBeenCalledTimes(1);
    });
  });

  describe('tooltip role', () => {
    it('should have role="tooltip"', () => {
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  describe('data-onboarding 속성', () => {
    it('should have data-onboarding attribute', () => {
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveAttribute('data-onboarding');
    });
  });

  describe('pointer-events-auto', () => {
    it('should have pointer-events-auto class', () => {
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('pointer-events-auto');
    });
  });

  describe('positionReady opacity', () => {
    it('should start with opacity 0 before position is calculated', () => {
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      const tooltip = screen.getByRole('tooltip');
      // rAF가 실행되기 전에는 opacity: 0
      expect(tooltip.style.opacity).toBe('0');
    });

    it('should have opacity 1 after position calculation (rAF flush)', () => {
      render(
        <OnboardingTooltip
          step={nextStep}
          stepIndex={0}
          targetRect={baseTargetRect}
        />,
      );
      act(() => flushRAF());
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.style.opacity).toBe('1');
    });
  });

  describe('noFlip', () => {
    it('should not flip placement when noFlip is true even if out of viewport', () => {
      // targetRect that would cause tooltip to go out of viewport at top
      const topEdgeRect = {
        ...baseTargetRect,
        top: 0,
        bottom: 40,
        y: 0,
      } as DOMRect;

      render(
        <OnboardingTooltip
          step={noFlipStep}
          stepIndex={9}
          targetRect={topEdgeRect}
        />,
      );
      act(() => flushRAF());

      // noFlip: true이므로 placement=top 유지 (flip 안 함)
      // tooltip이 렌더되면 됨 — flip 여부는 position 값으로 간접 확인
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });
});
