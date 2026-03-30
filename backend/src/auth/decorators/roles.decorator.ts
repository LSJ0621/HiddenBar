import { SetMetadata } from '@nestjs/common';
import { Role } from '@my-project/shared';

export const ROLES_KEY = 'roles';

/**
 * 엔드포인트에 필요한 역할을 지정하는 데코레이터.
 * RolesGuard와 함께 사용한다.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
