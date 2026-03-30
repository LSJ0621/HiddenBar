import { RolesGuard } from './roles.guard.js';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@my-project/shared';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(role: string): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 1, email: 'test@example.com', role },
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow ADMIN user when @Roles(ADMIN) is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.ADMIN);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject USER when @Roles(ADMIN) is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.USER);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow any user when no roles are specified', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext(Role.USER);
    expect(guard.canActivate(context)).toBe(true);
  });
});
