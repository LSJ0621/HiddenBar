import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OriginValidationMiddleware } from './origin-validation.middleware';

describe('OriginValidationMiddleware', () => {
  const FRONTEND_URL = 'http://localhost:3000';
  let middleware: OriginValidationMiddleware;
  let next: jest.Mock;

  beforeEach(() => {
    // 프로덕션 환경에서 동작하도록 설정
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const configService = {
      get: jest.fn().mockReturnValue(FRONTEND_URL),
    } as unknown as ConfigService;

    middleware = new OriginValidationMiddleware(configService);
    next = jest.fn();

    process.env.NODE_ENV = originalEnv;
  });

  it('GET 요청은 Origin 없이도 통과한다', () => {
    const req = { method: 'GET', headers: {} } as any;
    middleware.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('HEAD 요청은 Origin 없이도 통과한다', () => {
    const req = { method: 'HEAD', headers: {} } as any;
    middleware.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('OPTIONS 요청은 Origin 없이도 통과한다', () => {
    const req = { method: 'OPTIONS', headers: {} } as any;
    middleware.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('POST 요청에서 올바른 Origin이면 통과한다', () => {
    const req = { method: 'POST', headers: { origin: FRONTEND_URL } } as any;
    middleware.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('POST 요청에서 Origin이 없으면 403을 반환한다', () => {
    const req = { method: 'POST', headers: {} } as any;
    expect(() => middleware.use(req, {} as any, next)).toThrow(ForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });

  it('POST 요청에서 Origin이 다르면 403을 반환한다', () => {
    const req = { method: 'POST', headers: { origin: 'http://evil.com' } } as any;
    expect(() => middleware.use(req, {} as any, next)).toThrow(ForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });

  it('Origin이 없을 때 Referer에서 origin을 추출한다', () => {
    const req = {
      method: 'POST',
      headers: { referer: 'http://localhost:3000/bars/123' },
    } as any;
    middleware.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('Referer의 origin이 다르면 403을 반환한다', () => {
    const req = {
      method: 'POST',
      headers: { referer: 'http://evil.com/page' },
    } as any;
    expect(() => middleware.use(req, {} as any, next)).toThrow(ForbiddenException);
  });

  it('DELETE 요청도 Origin을 검증한다', () => {
    const req = { method: 'DELETE', headers: {} } as any;
    expect(() => middleware.use(req, {} as any, next)).toThrow(ForbiddenException);
  });

  it('PATCH 요청도 Origin을 검증한다', () => {
    const req = { method: 'PATCH', headers: { origin: FRONTEND_URL } } as any;
    middleware.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('PUT 요청도 Origin을 검증한다', () => {
    const req = { method: 'PUT', headers: { origin: FRONTEND_URL } } as any;
    middleware.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  describe('테스트 환경에서는 비활성화', () => {
    it('NODE_ENV=test일 때 POST 요청이 Origin 없이도 통과한다', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const configService = {
        get: jest.fn().mockReturnValue(FRONTEND_URL),
      } as unknown as ConfigService;

      const testMiddleware = new OriginValidationMiddleware(configService);
      const req = { method: 'POST', headers: {} } as any;
      const testNext = jest.fn();

      testMiddleware.use(req, {} as any, testNext);
      expect(testNext).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
