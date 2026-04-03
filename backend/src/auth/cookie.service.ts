import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import type { Response, CookieOptions } from 'express';
import type { TokenPair } from './types/auth-response.type.js';

/** 쿠키 최대 수명: 7일 (밀리초) */
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * httpOnly 쿠키로 인증 토큰을 관리하는 서비스.
 */
@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 공통 쿠키 옵션을 생성한다.
   */
  private buildCookieOptions(overrides?: Partial<CookieOptions>): CookieOptions {
    const secure = this.configService.get<boolean>('cookie.secure', false);
    const sameSite = this.configService.get<'lax' | 'strict' | 'none'>(
      'cookie.sameSite',
      'lax',
    );
    const domain = this.configService.get<string>('cookie.domain') || undefined;

    return {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path: '/',
      maxAge: COOKIE_MAX_AGE_MS,
      ...overrides,
    };
  }

  /**
   * accessToken, refreshToken, isLoggedIn 쿠키를 설정한다.
   */
  setAuthCookies(res: Response, tokens: TokenPair): void {
    res.cookie(
      'accessToken',
      tokens.accessToken,
      this.buildCookieOptions(),
    );

    res.cookie(
      'refreshToken',
      tokens.refreshToken,
      this.buildCookieOptions({ path: '/api/v1/auth' }),
    );

    res.cookie(
      'isLoggedIn',
      'true',
      this.buildCookieOptions({ httpOnly: false }),
    );
  }

  /**
   * 인증 관련 쿠키 3개를 모두 삭제한다.
   */
  clearAuthCookies(res: Response): void {
    res.cookie(
      'accessToken',
      '',
      this.buildCookieOptions({ maxAge: 0 }),
    );

    res.cookie(
      'refreshToken',
      '',
      this.buildCookieOptions({ path: '/api/v1/auth', maxAge: 0 }),
    );

    res.cookie(
      'isLoggedIn',
      '',
      this.buildCookieOptions({ httpOnly: false, maxAge: 0 }),
    );
  }
}
