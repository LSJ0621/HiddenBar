import { formatRelativeDate } from './date-utils';

describe('formatRelativeDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // 2026-04-06T12:00:00Z 로 고정
    jest.setSystemTime(new Date('2026-04-06T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('1시간 미만이면 "Just now"를 반환한다', () => {
    expect(formatRelativeDate('2026-04-06T11:30:00Z')).toBe('Just now');
  });

  it('정확히 0분 전이면 "Just now"를 반환한다', () => {
    expect(formatRelativeDate('2026-04-06T12:00:00Z')).toBe('Just now');
  });

  it('3시간 전이면 "3h ago"를 반환한다', () => {
    expect(formatRelativeDate('2026-04-06T09:00:00Z')).toBe('3h ago');
  });

  it('23시간 전이면 "23h ago"를 반환한다', () => {
    expect(formatRelativeDate('2026-04-05T13:00:00Z')).toBe('23h ago');
  });

  it('2일 전이면 "2d ago"를 반환한다', () => {
    expect(formatRelativeDate('2026-04-04T12:00:00Z')).toBe('2d ago');
  });

  it('30일 이상이면 일수로 반환한다', () => {
    expect(formatRelativeDate('2026-03-01T12:00:00Z')).toBe('36d ago');
  });

  it('정확히 24시간(1일) 전이면 "1d ago"를 반환한다', () => {
    expect(formatRelativeDate('2026-04-05T12:00:00Z')).toBe('1d ago');
  });
});
