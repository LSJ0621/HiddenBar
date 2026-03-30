import { JwtAuthGuard } from './jwt-auth.guard.js';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

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
});
