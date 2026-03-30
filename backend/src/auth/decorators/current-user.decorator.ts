import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 현재 인증된 사용자 정보를 추출하는 데코레이터.
 * JwtAuthGuard를 통해 request.user에 주입된 사용자 객체를 반환한다.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    return request.user;
  },
);
