import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import type { Response } from 'express';
import type { TokenPair } from './types/auth-response.type.js';

/**
 * httpOnly 쿠키로 인증 토큰을 관리하는 서비스.
 */
@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * accessToken, refreshToken, isLoggedIn 쿠키를 설정한다.
   */
  setAuthCookies(res: Response, tokens: TokenPair): void {
    const secure = this.configService.get<boolean>('cookie.secure', false);
    const sameSite = this.configService.get<'lax' | 'strict' | 'none'>(
      'cookie.sameSite',
      'lax',
    );
    const accessExpiration =
      this.configService.get<string>('jwt.accessExpiration') ?? '15m';
    const accessMaxAge =
      ms(accessExpiration as ms.StringValue) || 15 * 60 * 1000;

    const domain = this.configService.get<string>('cookie.domain') || undefined;

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    res.cookie('isLoggedIn', 'true', {
      httpOnly: false,
      secure,
      sameSite,
      domain,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });
  }

  /**
   * 인증 관련 쿠키 3개를 모두 삭제한다.
   */
  clearAuthCookies(res: Response): void {
    const secure = this.configService.get<boolean>('cookie.secure', false);
    const sameSite = this.configService.get<'lax' | 'strict' | 'none'>(
      'cookie.sameSite',
      'lax',
    );

    const domain = this.configService.get<string>('cookie.domain') || undefined;

    res.cookie('accessToken', '', {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path: '/',
      maxAge: 0,
    });

    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path: '/api/v1/auth',
      maxAge: 0,
    });

    res.cookie('isLoggedIn', '', {
      httpOnly: false,
      secure,
      sameSite,
      domain,
      path: '/',
      maxAge: 0,
    });
  }
}
