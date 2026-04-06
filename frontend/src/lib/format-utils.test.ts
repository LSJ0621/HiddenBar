import { formatDistance } from './format-utils';

describe('formatDistance', () => {
  it('0km -> "0m"', () => {
    expect(formatDistance(0)).toBe('0m');
  });

  it('0.35km -> "350m"', () => {
    expect(formatDistance(0.35)).toBe('350m');
  });

  it('0.999km -> "999m"', () => {
    expect(formatDistance(0.999)).toBe('999m');
  });

  it('1.0km -> "1.0km"', () => {
    expect(formatDistance(1.0)).toBe('1.0km');
  });

  it('1.25km -> "1.3km" (소수점 한 자리 반올림)', () => {
    expect(formatDistance(1.25)).toBe('1.3km');
  });

  it('10km -> "10.0km"', () => {
    expect(formatDistance(10)).toBe('10.0km');
  });

  it('0.001km -> "1m"', () => {
    expect(formatDistance(0.001)).toBe('1m');
  });

  it('0.0004km -> "0m" (반올림으로 0m)', () => {
    expect(formatDistance(0.0004)).toBe('0m');
  });
});
