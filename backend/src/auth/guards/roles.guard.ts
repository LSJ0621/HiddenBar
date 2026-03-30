import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@my-project/shared';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * 역할 기반 접근 제어 가드.
 * @Roles() 데코레이터로 지정된 역할과 사용자 역할을 비교한다.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user: { role: Role } }>();
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Access denied.');
    }

    return true;
  }
}
