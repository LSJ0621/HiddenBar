import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { AdminAction } from '../entities/admin-action.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import {
  Role,
  AdminActionType,
  AuthProvider,
} from '@my-project/shared';
import { buildPaginationMeta } from '../common/utils/pagination.js';
import { runInTransaction } from '../common/utils/transaction.js';
import { createAdminAction } from './admin-action.helper.js';
import { AdminTargetType } from './admin-target-type.js';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto.js';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(AdminAction)
    private readonly adminActionRepository: Repository<AdminAction>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 관리자용 유저 목록을 조회한다.
   */
  async findUsers(query: AdminUsersQueryDto) {
    const { page = 1, limit = 20, q, role, isActive } = query;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .loadRelationCountAndMap('user.barCount', 'user.bars')
      .loadRelationCountAndMap('user.bookmarkCount', 'user.bookmarks')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (q) {
      qb.andWhere('(user.email ILIKE :q OR user.name ILIKE :q)', {
        q: `%${q}%`,
      });
    }

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive });
    }

    const [items, totalItems] = await qb.getManyAndCount();

    return {
      items,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }

  /**
   * 관리자용 유저 상세를 조회한다. 가게 목록과 관리자 액션 이력을 포함한다.
   */
  async findUserById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['bars', 'accounts'],
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const bookmarkCount = await this.bookmarkRepository.count({
      where: { userId: id },
    });

    const recentActions = await this.adminActionRepository.find({
      where: { targetType: AdminTargetType.USER, targetId: id },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const provider = user.accounts?.[0]?.provider ?? AuthProvider.EMAIL;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      provider,
      barCount: (user.bars || []).length,
      bookmarkCount,
      bars: (user.bars || []).map((bar) => ({
        id: bar.id,
        name: bar.name,
        status: bar.status,
        city: bar.city,
        country: bar.country,
      })),
      recentActions: recentActions.map((a) => ({
        actionType: a.actionType,
        reason: a.reason,
        createdAt: a.createdAt,
      })),
    };
  }

  /**
   * 유저를 정지한다. 트랜잭션으로 상태 변경 + 토큰 삭제 + 감사 로그를 기록한다.
   */
  async suspendUser(userId: number, adminId: number, reason: string) {
    if (userId === adminId) {
      throw new ForbiddenException('You cannot suspend yourself.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!user.isActive) {
      throw new ConflictException('This user is already suspended.');
    }

    return runInTransaction(this.dataSource, async (manager) => {
      user.isActive = false;
      await manager.save(user);

      await manager.delete(RefreshToken, { userId });

      await createAdminAction(manager, {
        actionType: AdminActionType.USER_SUSPENDED,
        targetType: AdminTargetType.USER,
        targetId: userId,
        adminId,
        reason,
      });

      return { id: userId, isActive: false };
    });
  }

  /**
   * 유저를 활성화한다. 트랜잭션으로 상태 변경 + 감사 로그를 기록한다.
   */
  async activateUser(userId: number, adminId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.isActive) {
      throw new ConflictException('This user is already active.');
    }

    return runInTransaction(this.dataSource, async (manager) => {
      user.isActive = true;
      await manager.save(user);

      await createAdminAction(manager, {
        actionType: AdminActionType.USER_ACTIVATED,
        targetType: AdminTargetType.USER,
        targetId: userId,
        adminId,
      });

      return { id: userId, isActive: true };
    });
  }

  /**
   * 유저 역할을 변경한다. 트랜잭션으로 역할 변경 + 감사 로그를 기록한다.
   */
  async changeUserRole(
    userId: number,
    adminId: number,
    role: Role,
    reason?: string,
  ) {
    if (userId === adminId) {
      throw new ForbiddenException('You cannot change your own role.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role === role) {
      throw new ConflictException('User already has this role.');
    }

    if (user.role === Role.ADMIN && role !== Role.ADMIN) {
      const adminCount = await this.userRepository.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException(
          'Cannot change the role of the last admin.',
        );
      }
    }

    const fromRole = user.role;

    return runInTransaction(this.dataSource, async (manager) => {
      user.role = role;
      await manager.save(user);

      await createAdminAction(manager, {
        actionType: AdminActionType.USER_ROLE_CHANGED,
        targetType: AdminTargetType.USER,
        targetId: userId,
        adminId,
        reason,
        metadata: { fromRole, toRole: role },
      });

      return { id: userId, role };
    });
  }
}
