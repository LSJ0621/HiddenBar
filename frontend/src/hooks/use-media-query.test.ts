import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  let listeners: Map<string, Set<() => void>>;
  let mediaStates: Map<string, boolean>;

  beforeEach(() => {
    listeners = new Map();
    mediaStates = new Map();

    window.matchMedia = jest.fn((query: string) => {
      if (!listeners.has(query)) {
        listeners.set(query, new Set());
      }
      if (!mediaStates.has(query)) {
        mediaStates.set(query, false);
      }

      return {
        matches: mediaStates.get(query)!,
        media: query,
        addEventListener: (_event: string, cb: () => void) => {
          listeners.get(query)!.add(cb);
        },
        removeEventListener: (_event: string, cb: () => void) => {
          listeners.get(query)!.delete(cb);
        },
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      } as unknown as MediaQueryList;
    });
  });

  /** 미디어 쿼리 상태를 변경하고 리스너에 알림 */
  function setMediaMatch(query: string, matches: boolean) {
    mediaStates.set(query, matches);
    const cbs = listeners.get(query);
    if (cbs) {
      cbs.forEach((cb) => cb());
    }
  }

  it('should return matches: false for non-matching query', () => {
    mediaStates.set('(min-width: 1024px)', false);

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current.matches).toBe(false);
    expect(result.current.mounted).toBe(true);
  });

  it('should return matches: true for matching query', () => {
    mediaStates.set('(min-width: 1024px)', true);

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current.matches).toBe(true);
    expect(result.current.mounted).toBe(true);
  });

  it('should update matches when media query changes', () => {
    mediaStates.set('(min-width: 1024px)', false);

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current.matches).toBe(false);

    act(() => {
      setMediaMatch('(min-width: 1024px)', true);
    });

    expect(result.current.matches).toBe(true);
  });

  it('should clean up listener on unmount', () => {
    mediaStates.set('(min-width: 768px)', false);

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(listeners.get('(min-width: 768px)')!.size).toBeGreaterThan(0);

    unmount();

    expect(listeners.get('(min-width: 768px)')!.size).toBe(0);
  });
});
