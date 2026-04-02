import { render, act } from '@testing-library/react';

import { OnboardingOverlay, OnboardingTargetTracker } from './onboarding-overlay';

// requestAnimationFrame/cancelAnimationFrame mock
let rafCallbacks: Array<() => void> = [];
const originalRAF = globalThis.requestAnimationFrame;
const originalCAF = globalThis.cancelAnimationFrame;

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

// ResizeObserver mock
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

beforeAll(() => {
  globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: mockObserve,
    unobserve: jest.fn(),
    disconnect: mockDisconnect,
  }));
});

/** viewport 내 유효한 DOMRect을 생성하는 헬퍼 */
function makeRect(overrides?: Partial<DOMRect>): DOMRect {
  return {
    top: 100,
    left: 200,
    bottom: 150,
    right: 300,
    width: 100,
    height: 50,
    x: 200,
    y: 100,
    toJSON: () => {},
    ...overrides,
  } as DOMRect;
}

/** DOM에 target 요소를 추가하고 cleanup 함수를 반환 */
function addTarget(id: string, rect?: DOMRect) {
  const el = document.createElement('div');
  el.id = id;
  el.getBoundingClientRect = jest.fn(() => rect ?? makeRect());
  document.body.appendChild(el);
  return () => document.body.removeChild(el);
}

describe('OnboardingOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rafCallbacks = [];
  });

  it('should not render anything when target is not found (rect is null)', () => {
    render(
      <OnboardingOverlay target="#nonexistent" onRectChange={jest.fn()} />,
    );
    // rect가 null이면 null 반환 (Portal 없음)
    const overlayEl = document.querySelector('[data-onboarding]');
    expect(overlayEl).not.toBeInTheDocument();
  });

  it('should render 4 panels via Portal to document.body when target is found', () => {
    const cleanup = addTarget('four-panel');
    const onRectChange = jest.fn();

    render(
      <OnboardingOverlay target="#four-panel" onRectChange={onRectChange} />,
    );

    act(() => flushRAF());

    // Portal로 body에 렌더된 overlay wrapper
    const overlayWrapper = document.querySelector('[data-onboarding]');
    expect(overlayWrapper).toBeInTheDocument();
    // body의 직속 자식이어야 함 (Portal)
    expect(overlayWrapper?.parentElement).toBe(document.body);

    // 4개 패널 확인 (top, bottom, left, right)
    const panels = overlayWrapper?.querySelectorAll('.bg-black\\/60');
    expect(panels).toHaveLength(4);

    cleanup();
  });

  it('should render panels with pointer-events-auto class', () => {
    const cleanup = addTarget('pe-target');

    render(
      <OnboardingOverlay target="#pe-target" onRectChange={jest.fn()} />,
    );

    act(() => flushRAF());

    const panels = document.querySelectorAll('[data-onboarding] .pointer-events-auto');
    expect(panels.length).toBe(4);

    cleanup();
  });

  it('should have data-onboarding attribute on wrapper', () => {
    const cleanup = addTarget('attr-target');

    render(
      <OnboardingOverlay target="#attr-target" onRectChange={jest.fn()} />,
    );

    act(() => flushRAF());

    expect(document.querySelector('[data-onboarding]')).toBeInTheDocument();

    cleanup();
  });

  it('should have aria-hidden true on wrapper', () => {
    const cleanup = addTarget('aria-target');

    render(
      <OnboardingOverlay target="#aria-target" onRectChange={jest.fn()} />,
    );

    act(() => flushRAF());

    const wrapper = document.querySelector('[data-onboarding]');
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');

    cleanup();
  });

  it('should render panels with z-[9998] class', () => {
    const cleanup = addTarget('z-target');

    render(
      <OnboardingOverlay target="#z-target" onRectChange={jest.fn()} />,
    );

    act(() => flushRAF());

    const panels = document.querySelectorAll('[data-onboarding] .z-\\[9998\\]');
    expect(panels.length).toBe(4);

    cleanup();
  });

  it('should calculate 4-panel positions based on target rect', () => {
    const rect = makeRect({ top: 100, left: 200, bottom: 150, right: 300, width: 100, height: 50 });
    const cleanup = addTarget('calc-target', rect);
    const onRectChange = jest.fn();

    render(
      <OnboardingOverlay target="#calc-target" onRectChange={onRectChange} />,
    );

    act(() => flushRAF());

    // Top panel: height = cutTop = 100 - 8 = 92
    const panels = document.querySelectorAll('[data-onboarding] > div');
    expect(panels).toHaveLength(4);

    const topPanel = panels[0] as HTMLElement;
    expect(topPanel.style.height).toBe('92px');
    expect(topPanel.style.width).toBe('100vw');

    expect(onRectChange).toHaveBeenCalledWith(rect);

    cleanup();
  });

  it('should add onboarding-highlight class to target element', () => {
    const cleanup = addTarget('hl-target');

    render(
      <OnboardingOverlay target="#hl-target" onRectChange={jest.fn()} />,
    );

    act(() => flushRAF());

    const el = document.getElementById('hl-target');
    expect(el?.classList.contains('onboarding-highlight')).toBe(true);

    cleanup();
  });

  it('should remove onboarding-highlight class on unmount', () => {
    const cleanup = addTarget('unmount-target');

    const { unmount } = render(
      <OnboardingOverlay target="#unmount-target" onRectChange={jest.fn()} />,
    );

    act(() => flushRAF());

    const el = document.getElementById('unmount-target');
    expect(el?.classList.contains('onboarding-highlight')).toBe(true);

    unmount();
    expect(el?.classList.contains('onboarding-highlight')).toBe(false);

    cleanup();
  });

  it('should not render overlay when rect is outside viewport', () => {
    // viewport 밖에 있는 rect
    const outOfViewRect = makeRect({ top: -200, left: -200, bottom: -150, right: -100 });
    const cleanup = addTarget('oov-target', outOfViewRect);

    render(
      <OnboardingOverlay target="#oov-target" onRectChange={jest.fn()} />,
    );

    act(() => flushRAF());

    // isRectInViewport 실패 → rect null → 렌더 안 함
    expect(document.querySelector('[data-onboarding]')).not.toBeInTheDocument();

    cleanup();
  });

  it('should call onRectChange with null when target not found within timeout', () => {
    const onRectChange = jest.fn();

    const realDateNow = Date.now;
    let callCount = 0;
    Date.now = jest.fn(() => {
      callCount++;
      return callCount <= 1 ? 0 : 4000;
    });

    render(
      <OnboardingOverlay target="#nonexistent" onRectChange={onRectChange} />,
    );

    act(() => flushRAF());
    act(() => flushRAF());

    expect(onRectChange).toHaveBeenCalledWith(null);

    Date.now = realDateNow;
  });
});

describe('OnboardingTargetTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rafCallbacks = [];
  });

  it('should render nothing (returns null)', () => {
    const { container } = render(
      <OnboardingTargetTracker target="#nonexistent" onRectChange={jest.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should track target rect without rendering overlay', () => {
    const cleanup = addTarget('tracker-target');
    const onRectChange = jest.fn();

    render(
      <OnboardingTargetTracker
        target="#tracker-target"
        onRectChange={onRectChange}
      />,
    );

    act(() => flushRAF());

    // rect를 추적하되 overlay는 없어야 함
    expect(onRectChange).toHaveBeenCalled();
    expect(document.querySelector('[data-onboarding]')).not.toBeInTheDocument();

    cleanup();
  });

  it('should not add onboarding-highlight class to target', () => {
    const cleanup = addTarget('no-hl-target');

    render(
      <OnboardingTargetTracker
        target="#no-hl-target"
        onRectChange={jest.fn()}
      />,
    );

    act(() => flushRAF());

    const el = document.getElementById('no-hl-target');
    expect(el?.classList.contains('onboarding-highlight')).toBe(false);

    cleanup();
  });
});
