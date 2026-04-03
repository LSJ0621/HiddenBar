import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Bar } from '../entities/bar.entity.js';
import { MenuItem } from '../entities/menu-item.entity.js';
import { OperatingHours } from '../entities/operating-hours.entity.js';
import { BarPhoto } from '../entities/bar-photo.entity.js';
import { extractThumbnail } from '../common/utils/photo-utils.js';
import { runInTransaction } from '../common/utils/transaction.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { BarStatus, Role } from '@my-project/shared';
import { CreateBarDto } from './dto/create-bar.dto.js';
import { UpdateBarDto } from './dto/update-bar.dto.js';
import { MyBarsQueryDto } from './dto/my-bars-query.dto.js';
import { NearbyBarsDto } from './dto/nearby-bars.dto.js';
import { DEFAULT_CURRENCY } from '../common/constants/currency.js';
import { buildPaginationMeta } from '../common/utils/pagination.js';

@Injectable()
export class BarsService {
  constructor(
    @InjectRepository(Bar)
    private readonly barRepository: Repository<Bar>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 가게를 등록한다. 트랜잭션으로 bar + menuItems + operatingHours를 생성한다.
   */
  async create(dto: CreateBarDto, user: { id: number }): Promise<Bar & { isBookmarked: boolean; bookmarkCount: number; averageRating: number; reviewCount: number }> {
    const {
      menuItems: menuItemsDto,
      operatingHours: operatingHoursDto,
      ...barData
    } = dto;

    const savedBar = await runInTransaction(this.dataSource, async (manager) => {
      const bar = manager.create(Bar, {
        ...barData,
        ownerId: user.id,
        status: BarStatus.PENDING,
      });
      const saved = await manager.save(bar);

      if (menuItemsDto && menuItemsDto.length > 0) {
        const menuItems = menuItemsDto.map((item) =>
          manager.create(MenuItem, {
            ...item,
            currency: DEFAULT_CURRENCY,
            barId: saved.id,
          }),
        );
        await manager.save(menuItems);
      }

      if (operatingHoursDto && operatingHoursDto.length > 0) {
        const hours = operatingHoursDto.map((h) =>
          manager.create(OperatingHours, {
            ...h,
            barId: saved.id,
          }),
        );
        await manager.save(hours);
      }

      return saved;
    });

    const created = (await this.barRepository.findOne({
      where: { id: savedBar.id },
      relations: ['owner', 'photos', 'menuItems', 'operatingHours'],
    })) as Bar;

    return Object.assign(created, { bookmarkCount: 0, isBookmarked: false, averageRating: 0, reviewCount: 0 });
  }

  /**
   * 가게 상세를 조회한다. 상태별 접근 제어를 적용한다.
   */
  async findOne(
    id: number,
    user: { id: number; role: Role },
  ): Promise<Bar & { isBookmarked: boolean; bookmarkCount: number; averageRating: number; reviewCount: number }> {
    const bar = await this.barRepository.findOne({
      where: { id },
      relations: ['owner', 'photos', 'menuItems', 'operatingHours', 'reviewStats'],
    });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.status !== BarStatus.APPROVED) {
      const isOwner = bar.ownerId === user.id;
      const isAdmin = user.role === Role.ADMIN;
      if (!isOwner && !isAdmin) {
        throw new NotFoundException('Bar not found.');
      }
    }

    const bookmark = await this.bookmarkRepository.findOne({
      where: { barId: id, userId: user.id },
    });
    const isBookmarked = !!bookmark;

    const bookmarkCount = await this.bookmarkRepository.count({
      where: { barId: id },
    });

    const averageRating = bar.reviewStats ? Number(bar.reviewStats.ratingAvg) : 0;
    const reviewCount = bar.reviewStats?.reviewCount ?? 0;

    return Object.assign(bar, { isBookmarked, bookmarkCount, averageRating, reviewCount });
  }

  /**
   * 가게 정보를 수정한다. 수정 시 status는 PENDING으로 변경된다.
   */
  async update(
    id: number,
    dto: UpdateBarDto,
    user: { id: number },
  ): Promise<Bar> {
    const bar = await this.barRepository.findOne({ where: { id } });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.ownerId !== user.id) {
      throw new ForbiddenException('Only the bar owner can edit this bar.');
    }

    const { menuItems, operatingHours, ...barData } = dto;

    await runInTransaction(this.dataSource, async (manager) => {
      Object.assign(bar, barData, { status: BarStatus.PENDING });
      await manager.save(bar);

      if (menuItems !== undefined) {
        await manager.update(MenuItem, { barId: id }, { deletedAt: new Date() });
        if (menuItems.length > 0) {
          const items = menuItems.map((item) =>
            manager.create(MenuItem, { ...item, currency: DEFAULT_CURRENCY, barId: id }),
          );
          await manager.save(MenuItem, items);
        }
      }

      if (operatingHours !== undefined) {
        await manager.update(OperatingHours, { barId: id }, { deletedAt: new Date() });
        if (operatingHours.length > 0) {
          const hours = operatingHours.map((hour) =>
            manager.create(OperatingHours, { ...hour, barId: id }),
          );
          await manager.save(OperatingHours, hours);
        }
      }
    });

    const updated = (await this.barRepository.findOne({
      where: { id },
      relations: ['owner', 'photos', 'menuItems', 'operatingHours', 'reviewStats'],
    })) as Bar;

    const bookmarkCount = await this.bookmarkRepository.count({
      where: { barId: id },
    });
    const bookmark = await this.bookmarkRepository.findOne({
      where: { barId: id, userId: user.id },
    });

    const averageRating = updated.reviewStats ? Number(updated.reviewStats.ratingAvg) : 0;
    const reviewCount = updated.reviewStats?.reviewCount ?? 0;

    return Object.assign(updated, { bookmarkCount, isBookmarked: !!bookmark, averageRating, reviewCount });
  }

  /**
   * 가게와 관련 엔티티를 소프트 삭제한다. 외부 트랜잭션에서도 호출 가능하다.
   */
  async softDeleteBarWithRelations(
    barId: number,
    manager: import('typeorm').EntityManager,
  ): Promise<void> {
    const barEntity = await manager.findOne(Bar, { where: { id: barId } });
    if (!barEntity) {
      throw new NotFoundException('Bar not found.');
    }
    const now = new Date();
    await manager.update(BarPhoto, { barId }, { deletedAt: now });
    await manager.update(MenuItem, { barId }, { deletedAt: now });
    await manager.update(OperatingHours, { barId }, { deletedAt: now });
    await manager.update(Bookmark, { barId }, { deletedAt: now });
    await manager.softRemove(barEntity);
  }

  /**
   * 가게를 소프트 삭제한다.
   */
  async remove(id: number, user: { id: number }): Promise<void> {
    const bar = await this.barRepository.findOne({ where: { id } });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.ownerId !== user.id) {
      throw new ForbiddenException('Only the bar owner can delete this bar.');
    }

    await runInTransaction(this.dataSource, async (manager) => {
      await this.softDeleteBarWithRelations(id, manager);
    });
  }

  /**
   * 주변 가게를 PostGIS ST_DWithin/ST_Distance로 검색한다.
   */
  async findNearby(dto: NearbyBarsDto): Promise<{
    items: Array<{
      id: number;
      name: string;
      address: string;
      city: string;
      latitude: number;
      longitude: number;
      thumbnail: string | null;
      distanceKm: number;
      averageRating: number;
      reviewCount: number;
    }>;
    center: { lat: number; lng: number };
    radiusKm: number;
  }> {
    const { lat, lng, radiusKm, limit } = dto;

    const rows: Array<{
      id: number;
      name: string;
      address: string;
      city: string;
      latitude: number;
      longitude: number;
      thumbnail: string | null;
      distanceKm: number;
      averageRating: number;
      reviewCount: number;
    }> = await this.barRepository.query(
      `SELECT b.id, b.name, b.address, b.city, b.latitude, b.longitude,
        ROUND(CAST(
          ST_Distance(
            b.location,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
          ) / 1000 AS numeric
        ), 1) AS "distanceKm",
        (SELECT bp.url FROM bar_photos bp WHERE bp."barId" = b.id AND bp."deletedAt" IS NULL ORDER BY bp."order" ASC LIMIT 1) AS thumbnail,
        COALESCE(brs."ratingAvg", 0)::float AS "averageRating",
        COALESCE(brs."reviewCount", 0)::int AS "reviewCount"
      FROM bars b
      LEFT JOIN bar_review_stats brs ON brs."barId" = b.id
      WHERE b.status = 'APPROVED' AND b."deletedAt" IS NULL
        AND ST_DWithin(
          b.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3
        )
      ORDER BY "distanceKm" ASC
      LIMIT $4`,
      [lat, lng, radiusKm * 1000, limit],
    );

    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      city: row.city,
      latitude: row.latitude,
      longitude: row.longitude,
      thumbnail: row.thumbnail,
      distanceKm: Number(row.distanceKm),
      averageRating: Number(row.averageRating) || 0,
      reviewCount: Number(row.reviewCount) || 0,
    }));

    return { items, center: { lat, lng }, radiusKm };
  }

  /**
   * 내가 등록한 가게 목록을 조회한다.
   */
  async findMyBars(userId: number, query: MyBarsQueryDto) {
    const { page = 1, limit = 20, status } = query;

    const qb = this.barRepository
      .createQueryBuilder('bar')
      .where('bar.ownerId = :userId', { userId })
      .leftJoin('bar.photos', 'photo')
      .addSelect(['photo.url', 'photo.order'])
      .orderBy('bar.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('bar.status = :status', { status });
    }

    const [items, totalItems] = await qb.getManyAndCount();

    const mappedItems = items.map((bar) => {
      const photos = (bar as Bar & { photos?: BarPhoto[] }).photos || [];
      const thumbnail = extractThumbnail(photos);
      return {
        id: bar.id,
        name: bar.name,
        city: bar.city,
        country: bar.country,
        status: bar.status,
        thumbnail,
        createdAt: bar.createdAt,
      };
    });

    return {
      items: mappedItems,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }
}
