import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

/**
 * JWT 인증 전략. Access Token에서 사용자 정보를 추출한다.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        return req?.cookies?.accessToken ?? null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  /**
   * JWT payload를 검증하고 사용자 객체를 반환한다.
   */
  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
