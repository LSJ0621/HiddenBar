import { JwtStrategy } from './jwt.strategy.js';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;
    strategy = new JwtStrategy(configService);
  });

  it('should return user object from JWT payload', () => {
    const payload = { sub: 1, email: 'test@example.com', role: 'USER' };
    const result = strategy.validate(payload);
    expect(result).toEqual({ id: 1, email: 'test@example.com', role: 'USER' });
  });

  it('should map sub to id in returned object', () => {
    const payload = { sub: 42, email: 'admin@example.com', role: 'ADMIN' };
    const result = strategy.validate(payload);
    expect(result.id).toBe(42);
    expect(result).not.toHaveProperty('sub');
  });
});
