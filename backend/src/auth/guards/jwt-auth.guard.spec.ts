import { JwtAuthGuard } from './jwt-auth.guard.js';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(new Reflector());
  });

  it('should return user when valid token provides user', () => {
    const user = { id: 1, email: 'test@example.com', role: 'USER' };
    const result = guard.handleRequest(null, user);
    expect(result).toEqual(user);
  });

  it('should throw UnauthorizedException when no user (no header)', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when error occurs (expired token)', () => {
    const err = new Error('jwt expired');
    expect(() => guard.handleRequest(err, null)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when user is undefined (malformed token)', () => {
    expect(() => guard.handleRequest(null, undefined)).toThrow(
      UnauthorizedException,
    );
  });

  describe('canActivate', () => {
    const mockHandler = jest.fn();
    const mockClass = jest.fn();
    const mockContext = {
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    } as unknown as ExecutionContext;

    it('@Public() 데코레이터가 적용된 경우 true를 반환한다', () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const publicGuard = new JwtAuthGuard(reflector);

      const result = publicGuard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockHandler,
        mockClass,
      ]);
    });

    it('@Public()이 아닌 경우 super.canActivate를 호출한다', () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const nonPublicGuard = new JwtAuthGuard(reflector);

      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      const result = nonPublicGuard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(mockContext);

      superCanActivate.mockRestore();
    });
  });
});
