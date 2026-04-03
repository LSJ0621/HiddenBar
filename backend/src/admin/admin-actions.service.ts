import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAction } from '../entities/admin-action.entity.js';
import { buildPaginationMeta } from '../common/utils/pagination.js';
import { AdminActionsQueryDto } from './dto/admin-actions-query.dto.js';

@Injectable()
export class AdminActionsService {
  constructor(
    @InjectRepository(AdminAction)
    private readonly adminActionRepository: Repository<AdminAction>,
  ) {}

  /**
   * 감사 로그 목록을 조회한다.
   */
  async findActions(query: AdminActionsQueryDto) {
    const { page = 1, limit = 20, actionType, adminId, targetId } = query;

    const qb = this.adminActionRepository
      .createQueryBuilder('action')
      .leftJoinAndSelect('action.admin', 'admin')
      .orderBy('action.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (actionType) {
      qb.andWhere('action.actionType = :actionType', { actionType });
    }

    if (adminId) {
      qb.andWhere('action.adminId = :adminId', { adminId });
    }

    if (targetId) {
      qb.andWhere('action.targetId = :targetId', { targetId });
    }

    const [items, totalItems] = await qb.getManyAndCount();

    return {
      items,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }
}
