import { EntityManager } from 'typeorm';
import { AdminAction } from '../entities/admin-action.entity.js';
import { AdminActionType } from '@my-project/shared';
import { AdminTargetType } from './admin-target-type.js';

/**
 * 관리자 감사 로그를 생성하여 저장한다.
 */
export async function createAdminAction(
  manager: EntityManager,
  params: {
    actionType: AdminActionType;
    targetType: AdminTargetType;
    targetId: number;
    adminId: number;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<AdminAction> {
  const action = manager.create(AdminAction, {
    actionType: params.actionType,
    targetType: params.targetType,
    targetId: params.targetId,
    adminId: params.adminId,
    reason: params.reason ?? null,
    ...(params.metadata && { metadata: params.metadata }),
  });
  return manager.save(action);
}
