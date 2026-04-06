import { cleanParams } from './clean-params';

describe('cleanParams', () => {
  it('null 값을 제거한다', () => {
    expect(cleanParams({ a: 1, b: null })).toEqual({ a: 1 });
  });

  it('undefined 값을 제거한다', () => {
    expect(cleanParams({ a: 'hello', b: undefined })).toEqual({ a: 'hello' });
  });

  it('null과 undefined를 동시에 제거한다', () => {
    expect(cleanParams({ a: 1, b: null, c: undefined, d: 'ok' })).toEqual({
      a: 1,
      d: 'ok',
    });
  });

  it('유효한 falsy 값(0, false, "")은 유지한다', () => {
    expect(cleanParams({ a: 0, b: false, c: '' })).toEqual({
      a: 0,
      b: false,
      c: '',
    });
  });

  it('빈 객체를 입력하면 빈 객체를 반환한다', () => {
    expect(cleanParams({})).toEqual({});
  });

  it('모든 값이 null/undefined이면 빈 객체를 반환한다', () => {
    expect(cleanParams({ a: null, b: undefined })).toEqual({});
  });
});
