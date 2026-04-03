import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Bar } from '../entities/bar.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { AdminAction } from '../entities/admin-action.entity.js';
import {
  BarStatus,
  AdminActionType,
  AdminBarsSortBy,
} from '@my-project/shared';
import { extractThumbnail } from '../common/utils/photo-utils.js';
import { buildPaginationMeta } from '../common/utils/pagination.js';
import { runInTransaction } from '../common/utils/transaction.js';
import { createAdminAction } from './admin-action.helper.js';
import { AdminTargetType } from './admin-target-type.js';
import { AdminBarsQueryDto } from './dto/admin-bars-query.dto.js';
import { BarsService } from '../bars/bars.service.js';

@Injectable()
export class AdminBarsService {
  constructor(
    @InjectRepository(Bar)
    private readonly barRepository: Repository<Bar>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(AdminAction)
    private readonly adminActionRepository: Repository<AdminAction>,
    private readonly barsService: BarsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 관리자용 가게 목록을 조회한다.
   */
  async findBars(query: AdminBarsQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      q,
      country,
      sortBy = AdminBarsSortBy.NEWEST,
    } = query;

    const qb = this.barRepository
      .createQueryBuilder('bar')
      .leftJoin('bar.owner', 'owner')
      .addSelect(['owner.id', 'owner.name', 'owner.email'])
      .loadRelationCountAndMap('bar.photoCount', 'bar.photos');

    if (status) {
      qb.andWhere('bar.status = :status', { status });
    }

    if (q) {
      qb.andWhere('(bar.name ILIKE :q OR bar.address ILIKE :q)', {
        q: `%${q}%`,
      });
    }

    if (country) {
      qb.andWhere('bar.country = :country', { country });
    }

    switch (sortBy) {
      case AdminBarsSortBy.OLDEST:
        qb.orderBy('bar.createdAt', 'ASC');
        break;
      case AdminBarsSortBy.NAME:
        qb.orderBy('bar.name', 'ASC');
        break;
      case AdminBarsSortBy.NEWEST:
      default:
        qb.orderBy('bar.createdAt', 'DESC');
        break;
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();

    return {
      items,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }

  /**
   * 관리자용 가게 상세를 조회한다. 관리자 액션 이력을 포함한다.
   */
  async findBarById(id: number) {
    const bar = await this.barRepository.findOne({
      where: { id },
      relations: ['owner', 'photos', 'menuItems', 'operatingHours'],
    });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    const bookmarkCount = await this.bookmarkRepository.count({
      where: { barId: id },
    });

    const actions = await this.adminActionRepository.find({
      where: { targetType: AdminTargetType.BAR, targetId: id },
      relations: ['admin'],
      order: { createdAt: 'DESC' },
    });

    const thumbnail = extractThumbnail(bar.photos || []);

    const rejectAction = actions.find(
      (a) => a.actionType === AdminActionType.BAR_REJECTED,
    );
    const rejectionReason = rejectAction?.reason ?? null;

    return {
      id: bar.id,
      name: bar.name,
      description: bar.description,
      address: bar.address,
      city: bar.city,
      country: bar.country,
      latitude: bar.latitude,
      longitude: bar.longitude,
      phone: bar.phone,
      website: bar.website,
      status: bar.status,
      owner: { id: bar.owner.id, name: bar.owner.name, email: bar.owner.email },
      photos: (bar.photos || []).map((p) => ({
        id: p.id,
        url: p.url,
        order: p.order,
      })),
      photoCount: (bar.photos || []).length,
      thumbnail,
      bookmarkCount,
      rejectionReason,
      menuItems: (bar.menuItems || []).map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        price: m.price,
        currency: m.currency,
      })),
      operatingHours: (bar.operatingHours || []).map((h) => ({
        id: h.id,
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      })),
      createdAt: bar.createdAt,
      admin: {
        actions: actions.map((a) => ({
          actionType: a.actionType,
          reason: a.reason,
          admin: { id: a.admin.id, name: a.admin.name },
          createdAt: a.createdAt,
        })),
      },
    };
  }

  /**
   * 가게를 승인한다. 트랜잭션으로 상태 변경 + 감사 로그를 기록한다.
   */
  async approveBar(barId: number, adminId: number, reason?: string) {
    const bar = await this.barRepository.findOne({ where: { id: barId } });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.status !== BarStatus.PENDING) {
      throw new ConflictException(
        bar.status === BarStatus.APPROVED
          ? 'This bar is already approved.'
          : 'This bar cannot be approved in its current status.',
      );
    }

    return runInTransaction(this.dataSource, async (manager) => {
      bar.status = BarStatus.APPROVED;
      await manager.save(bar);

      await createAdminAction(manager, {
        actionType: AdminActionType.BAR_APPROVED,
        targetType: AdminTargetType.BAR,
        targetId: barId,
        adminId,
        reason,
      });

      return { id: barId, status: BarStatus.APPROVED };
    });
  }

  /**
   * 가게를 거절한다. 트랜잭션으로 상태 변경 + 감사 로그를 기록한다.
   */
  async rejectBar(barId: number, adminId: number, reason: string) {
    const bar = await this.barRepository.findOne({ where: { id: barId } });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.status === BarStatus.REJECTED) {
      throw new ConflictException('This bar is already rejected.');
    }

    return runInTransaction(this.dataSource, async (manager) => {
      bar.status = BarStatus.REJECTED;
      await manager.save(bar);

      await createAdminAction(manager, {
        actionType: AdminActionType.BAR_REJECTED,
        targetType: AdminTargetType.BAR,
        targetId: barId,
        adminId,
        reason,
      });

      return { id: barId, status: BarStatus.REJECTED };
    });
  }

  /**
   * 가게를 삭제한다 (soft delete). 트랜잭션으로 삭제 + 감사 로그를 기록한다.
   */
  async deleteBar(barId: number, adminId: number, reason?: string) {
    const bar = await this.barRepository.findOne({
      where: { id: barId },
      withDeleted: true,
    });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.deletedAt) {
      throw new ConflictException('This bar is already deleted.');
    }

    await runInTransaction(this.dataSource, async (manager) => {
      await this.barsService.softDeleteBarWithRelations(barId, manager);

      await createAdminAction(manager, {
        actionType: AdminActionType.BAR_DELETED,
        targetType: AdminTargetType.BAR,
        targetId: barId,
        adminId,
        reason,
      });
    });
  }
}
