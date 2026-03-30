import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * 사용자 ID 기반 rate limit guard.
 * JwtAuthGuard 이후에 실행되어야 req.user가 채워진 상태에서 동작한다.
 * 방어적으로 req.user가 없는 경우 IP 기반 fallback을 사용한다.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req.user?.id) {
      return `user-${req.user.id}`;
    }
    return req.ip ?? 'unknown';
  }
}
