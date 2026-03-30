import {
  ForbiddenException,
  Injectable,
  type NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

/** Origin 헤더가 없을 때 Referer에서 origin을 추출한다. */
function extractOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return null;
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF 방어를 위한 Origin 검증 미들웨어.
 * 상태 변경 요청(POST/PUT/PATCH/DELETE)에서 Origin 또는 Referer 헤더가
 * 허용된 프론트엔드 도메인과 일치하는지 확인한다.
 */
@Injectable()
export class OriginValidationMiddleware implements NestMiddleware {
  private readonly allowedOrigin: string;
  private readonly enabled: boolean;

  constructor(configService: ConfigService) {
    const frontendUrl = configService.get<string>('frontendUrl')!;
    // origin 비교를 위해 trailing slash 제거
    this.allowedOrigin = frontendUrl.replace(/\/+$/, '');
    // 테스트 환경에서는 비활성화 (CSRF는 브라우저 기반 공격이므로 supertest에서는 불필요)
    this.enabled = process.env.NODE_ENV !== 'test';
  }

  use(req: Request, _res: Response, next: NextFunction): void {
    if (!this.enabled || SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const origin =
      req.headers['origin'] ??
      (req.headers['referer']
        ? extractOrigin(req.headers['referer'])
        : null);

    if (!origin || origin !== this.allowedOrigin) {
      throw new ForbiddenException('Origin validation failed');
    }

    next();
  }
}
