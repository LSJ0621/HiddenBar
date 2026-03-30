import { User } from '../../entities/user.entity.js';
import { UserInfo } from '../../auth/types/auth-response.type.js';

/**
 * User 엔티티를 UserInfo DTO로 변환한다.
 */
export function toUserInfo(user: User): UserInfo {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profileImage: user.profileImage,
    role: user.role,
    createdAt: user.createdAt,
    hasPassword: user.passwordHash !== null,
  };
}
