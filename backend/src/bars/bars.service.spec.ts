import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BarsService } from './bars.service.js';
import { Bar } from '../entities/bar.entity.js';
import { MenuItem } from '../entities/menu-item.entity.js';
import { OperatingHours } from '../entities/operating-hours.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import {
  BarStatus,
  DayOfWeek,
  Role,
} from '@my-project/shared';
import { DataSource } from 'typeorm';

const mockBarRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn((dto: any) => dto),
  save: jest.fn((entity: any) => Promise.resolve({ id: 1, ...entity })),
  softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
  softRemove: jest
    .fn()
    .mockImplementation((entity: any) => Promise.resolve(entity)),
  createQueryBuilder: jest.fn(),
  query: jest.fn(),
});

const mockMenuItemRepository = () => ({
  create: jest.fn((dto: any) => dto),
  save: jest.fn((entities: any) => Promise.resolve(entities)),
});

const mockOperatingHoursRepository = () => ({
  create: jest.fn((dto: any) => dto),
  save: jest.fn((entities: any) => Promise.resolve(entities)),
});

const mockBookmarkRepository = () => ({
  findOne: jest.fn(),
  count: jest.fn(),
});

const mockDataSource = () => ({
  createQueryRunner: jest.fn().mockReturnValue({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn((entity: any) => Promise.resolve({ id: 1, ...entity })),
      create: jest.fn((_Entity: any, dto: any) => dto),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softRemove: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
    },
  }),
});

describe('BarsService', () => {
  let service: BarsService;
  let barRepo: ReturnType<typeof mockBarRepository>;
  let menuItemRepo: ReturnType<typeof mockMenuItemRepository>;
  let operatingHoursRepo: ReturnType<typeof mockOperatingHoursRepository>;
  let bookmarkRepo: ReturnType<typeof mockBookmarkRepository>;
  let dataSource: ReturnType<typeof mockDataSource>;

  const mockUser = { id: 1, email: 'test@example.com', role: Role.USER };
  const mockAdmin = { id: 2, email: 'admin@example.com', role: Role.ADMIN };

  const mockBar = {
    id: 1,
    name: 'The Secret Bar',
    description: 'A hidden gem',
    address: '123 Sukhumvit Rd',
    city: 'Bangkok',
    country: 'Thailand',
    latitude: 13.7563,
    longitude: 100.5018,
    phone: null,
    website: null,
    status: BarStatus.APPROVED,
    ownerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    owner: { id: 1, name: 'Test' },
    photos: [],
    menuItems: [],
    operatingHours: [],
    bookmarks: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarsService,
        { provide: getRepositoryToken(Bar), useFactory: mockBarRepository },
        {
          provide: getRepositoryToken(MenuItem),
          useFactory: mockMenuItemRepository,
        },
        {
          provide: getRepositoryToken(OperatingHours),
          useFactory: mockOperatingHoursRepository,
        },
        {
          provide: getRepositoryToken(Bookmark),
          useFactory: mockBookmarkRepository,
        },
        { provide: DataSource, useFactory: mockDataSource },
      ],
    }).compile();

    service = module.get<BarsService>(BarsService);
    barRepo = module.get(getRepositoryToken(Bar));
    menuItemRepo = module.get(getRepositoryToken(MenuItem));
    operatingHoursRepo = module.get(getRepositoryToken(OperatingHours));
    bookmarkRepo = module.get(getRepositoryToken(Bookmark));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── create ─────────────────────────────────────────────

  describe('create', () => {
    const createBarDto = {
      name: 'The Secret Bar',
      address: '123 Sukhumvit Rd',
      city: 'Bangkok',
      country: 'Thailand',
      latitude: 13.7563,
      longitude: 100.5018,
      menuItems: [{ name: 'Old Fashioned', price: 15 }],
      operatingHours: [
        { dayOfWeek: DayOfWeek.MON, openTime: '18:00', closeTime: '02:00' },
      ],
    };

    it('should create bar with status PENDING and return bar with relations', async () => {
      const qr = dataSource.createQueryRunner();
      qr.manager.save.mockResolvedValueOnce({
        id: 1,
        ...createBarDto,
        status: BarStatus.PENDING,
        ownerId: mockUser.id,
      });
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        status: BarStatus.PENDING,
      });

      const result = await service.create(createBarDto, mockUser);

      expect(result.status).toBe(BarStatus.PENDING);
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('should set ownerId from authenticated user', async () => {
      const qr = dataSource.createQueryRunner();
      qr.manager.save.mockResolvedValueOnce({
        id: 1,
        ...createBarDto,
        ownerId: mockUser.id,
      });
      barRepo.findOne.mockResolvedValue(mockBar);

      await service.create(createBarDto, mockUser);

      expect(qr.manager.create).toHaveBeenCalledWith(
        Bar,
        expect.objectContaining({ ownerId: mockUser.id }),
      );
    });

    it('should create menuItems and operatingHours in transaction', async () => {
      const qr = dataSource.createQueryRunner();
      qr.manager.save.mockResolvedValue({ id: 1, ...createBarDto });
      barRepo.findOne.mockResolvedValue(mockBar);

      await service.create(createBarDto, mockUser);

      // save should be called for bar, menuItems, and operatingHours
      expect(qr.manager.save).toHaveBeenCalledTimes(3);
    });

    it('should rollback transaction when error occurs during creation', async () => {
      const qr = dataSource.createQueryRunner();
      qr.manager.save.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.create(createBarDto, mockUser)).rejects.toThrow(
        'DB error',
      );

      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });

    it('should create bar without optional fields (menuItems, operatingHours)', async () => {
      const simpleDto = {
        name: 'Simple Bar',
        address: '456 Rd',
        city: 'Bangkok',
        country: 'Thailand',
        latitude: 13.75,
        longitude: 100.5,
      };
      const qr = dataSource.createQueryRunner();
      qr.manager.save.mockResolvedValue({ id: 1, ...simpleDto });
      barRepo.findOne.mockResolvedValue({ ...mockBar, ...simpleDto });

      const result = await service.create(simpleDto, mockUser);

      expect(result).toBeDefined();
      // Only one save call for the bar itself
      expect(qr.manager.save).toHaveBeenCalledTimes(1);
    });
  });

  // ─── findOne ────────────────────────────────────────────

  describe('findOne', () => {
    it('should return bar with all relations for APPROVED status', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.count.mockResolvedValue(5);

      const result = await service.findOne(1, mockUser);

      expect(result).toBeDefined();
      expect(result.bookmarkCount).toBe(5);
    });

    it('should throw NotFoundException for non-existent bar', async () => {
      barRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for non-APPROVED bar accessed by non-owner', async () => {
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        status: BarStatus.PENDING,
        ownerId: 99,
      });

      await expect(service.findOne(1, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow owner to access PENDING/REJECTED bar', async () => {
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        status: BarStatus.PENDING,
        ownerId: mockUser.id,
      });
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.count.mockResolvedValue(0);

      const result = await service.findOne(1, mockUser);

      expect(result).toBeDefined();
    });

    it('should allow admin to access any status bar', async () => {
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        status: BarStatus.REJECTED,
        ownerId: 99,
      });
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.count.mockResolvedValue(0);

      const result = await service.findOne(1, mockAdmin);

      expect(result).toBeDefined();
    });

    it('should include isBookmarked field for authenticated user', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      bookmarkRepo.findOne.mockResolvedValue({ id: 1 });
      bookmarkRepo.count.mockResolvedValue(5);

      const result = await service.findOne(1, mockUser);

      expect(result.isBookmarked).toBe(true);
    });

    it('should include bookmarkCount', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.count.mockResolvedValue(42);

      const result = await service.findOne(1, mockUser);

      expect(result.bookmarkCount).toBe(42);
    });

    it('should return averageRating and reviewCount as numbers when reviewStats exists', async () => {
      // Arrange: reviewStats가 있는 바
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        reviewStats: { ratingAvg: '4.3', reviewCount: 27 },
      });
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.count.mockResolvedValue(0);

      // Act
      const result = await service.findOne(1, mockUser);

      // Assert
      expect(typeof result.averageRating).toBe('number');
      expect(result.averageRating).toBeCloseTo(4.3);
      expect(typeof result.reviewCount).toBe('number');
      expect(result.reviewCount).toBe(27);
    });

    it('should return averageRating=0 and reviewCount=0 when reviewStats is null', async () => {
      // Arrange: reviewStats가 없는 바
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        reviewStats: null,
      });
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.count.mockResolvedValue(0);

      // Act
      const result = await service.findOne(1, mockUser);

      // Assert
      expect(result.averageRating).toBe(0);
      expect(result.reviewCount).toBe(0);
    });
  });

  // ─── update ─────────────────────────────────────────────

  describe('update', () => {
    it('should update bar fields and set status to PENDING', async () => {
      barRepo.findOne
        .mockResolvedValueOnce({ ...mockBar, ownerId: mockUser.id })
        .mockResolvedValueOnce({
          ...mockBar,
          name: 'Updated',
          status: BarStatus.PENDING,
        });
      const qr = dataSource.createQueryRunner();

      const result = await service.update(1, { name: 'Updated' }, mockUser);

      expect(result.name).toBe('Updated');
      expect(result.status).toBe(BarStatus.PENDING);
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      barRepo.findOne.mockResolvedValue({ ...mockBar, ownerId: 99 });

      await expect(
        service.update(1, { name: 'Updated' }, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent bar', async () => {
      barRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, { name: 'Updated' }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update menuItems by deleting old and creating new ones', async () => {
      barRepo.findOne
        .mockResolvedValueOnce({ ...mockBar, ownerId: mockUser.id })
        .mockResolvedValueOnce({ ...mockBar, status: BarStatus.PENDING });
      const qr = dataSource.createQueryRunner();

      const newMenuItems = [
        { name: 'Mojito', price: 12 },
        { name: 'Negroni', price: 14 },
      ];

      await service.update(1, { menuItems: newMenuItems }, mockUser);

      expect(qr.manager.update).toHaveBeenCalledWith(MenuItem, { barId: 1 }, { deletedAt: expect.any(Date) });
      expect(qr.manager.create).toHaveBeenCalledWith(
        MenuItem,
        expect.objectContaining({ name: 'Mojito', barId: 1 }),
      );
      expect(qr.manager.create).toHaveBeenCalledWith(
        MenuItem,
        expect.objectContaining({ name: 'Negroni', barId: 1 }),
      );
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('should update operatingHours by deleting old and creating new ones', async () => {
      barRepo.findOne
        .mockResolvedValueOnce({ ...mockBar, ownerId: mockUser.id })
        .mockResolvedValueOnce({ ...mockBar, status: BarStatus.PENDING });
      const qr = dataSource.createQueryRunner();

      const newHours = [
        { dayOfWeek: DayOfWeek.MON, openTime: '18:00', closeTime: '02:00' },
      ];

      await service.update(1, { operatingHours: newHours }, mockUser);

      expect(qr.manager.update).toHaveBeenCalledWith(OperatingHours, { barId: 1 }, { deletedAt: expect.any(Date) });
      expect(qr.manager.create).toHaveBeenCalledWith(
        OperatingHours,
        expect.objectContaining({ dayOfWeek: DayOfWeek.MON, barId: 1 }),
      );
      expect(qr.commitTransaction).toHaveBeenCalled();
    });
  });

  // ─── remove ─────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete bar and cascade to related entities', async () => {
      const barToDelete = { ...mockBar, ownerId: mockUser.id };
      barRepo.findOne.mockResolvedValue(barToDelete);
      const qr = dataSource.createQueryRunner();
      qr.manager.findOne.mockResolvedValue(barToDelete);

      await service.remove(1, mockUser);

      expect(qr.manager.update).toHaveBeenCalledTimes(4);
      expect(qr.manager.softRemove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      barRepo.findOne.mockResolvedValue({ ...mockBar, ownerId: 99 });

      await expect(service.remove(1, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for non-existent bar', async () => {
      barRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findNearby ────────────────────────────────────────

  describe('findNearby', () => {
    const nearbyQuery = { lat: 13.75, lng: 100.5, radiusKm: 5, limit: 20 };

    const mockRawRows = [
      {
        id: 1,
        name: 'Bar A',
        address: '123 Rd',
        city: 'Bangkok',
        latitude: 13.751,
        longitude: 100.501,
        distanceKm: 0.2,
        thumbnail: 'https://example.com/photo.jpg',
      },
      {
        id: 2,
        name: 'Bar B',
        address: '456 Rd',
        city: 'Bangkok',
        latitude: 13.76,
        longitude: 100.51,
        distanceKm: 1.5,
        thumbnail: null,
      },
    ];

    it('should return bars within radius sorted by distance', async () => {
      barRepo.query.mockResolvedValue(mockRawRows);

      const result = await service.findNearby(nearbyQuery);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].distanceKm).toBeLessThanOrEqual(
        result.items[1].distanceKm,
      );
      expect(result.center).toEqual({ lat: 13.75, lng: 100.5 });
      expect(result.radiusKm).toBe(5);
    });

    it('should use PostGIS ST_DWithin/ST_Distance and only query APPROVED bars', async () => {
      barRepo.query.mockResolvedValue([]);

      await service.findNearby(nearbyQuery);

      expect(barRepo.query).toHaveBeenCalledTimes(1);
      const sql = barRepo.query.mock.calls[0][0] as string;
      expect(sql).toContain("b.status = 'APPROVED'");
      expect(sql).toContain('b."deletedAt" IS NULL');
      expect(sql).toContain('ST_DWithin');
      expect(sql).toContain('ST_Distance');
    });

    it('should pass PostGIS parameters correctly (radiusKm converted to meters)', async () => {
      barRepo.query.mockResolvedValue([]);

      await service.findNearby(nearbyQuery);

      const params = barRepo.query.mock.calls[0][1];
      expect(params).toEqual([13.75, 100.5, 5000, 20]);
    });

    it('should return distanceKm as a number (rounded to 1 decimal)', async () => {
      barRepo.query.mockResolvedValue([
        { ...mockRawRows[0], distanceKm: '0.2' },
      ]);

      const result = await service.findNearby(nearbyQuery);

      expect(typeof result.items[0].distanceKm).toBe('number');
      expect(result.items[0].distanceKm).toBe(0.2);
    });

    it('should respect limit parameter', async () => {
      barRepo.query.mockResolvedValue([]);

      await service.findNearby({ ...nearbyQuery, limit: 5 });

      const params = barRepo.query.mock.calls[0][1];
      expect(params[2]).toBe(5000);
      expect(params[3]).toBe(5);
    });

    it('should include thumbnail from bar photos', async () => {
      barRepo.query.mockResolvedValue([mockRawRows[0]]);

      const result = await service.findNearby(nearbyQuery);

      expect(result.items[0].thumbnail).toBe('https://example.com/photo.jpg');
    });

    it('should return empty array when no bars nearby', async () => {
      barRepo.query.mockResolvedValue([]);

      const result = await service.findNearby(nearbyQuery);

      expect(result.items).toEqual([]);
      expect(result.center).toEqual({ lat: 13.75, lng: 100.5 });
    });
  });

  // ─── findMyBars ─────────────────────────────────────────

  describe('findMyBars', () => {
    it('should return paginated list of bars owned by user', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[{ ...mockBar, ownerId: mockUser.id }], 1]),
      };
      barRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMyBars(mockUser.id, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it('should filter by status when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findMyBars(mockUser.id, {
        page: 1,
        limit: 20,
        status: BarStatus.PENDING,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('bar.status = :status', {
        status: BarStatus.PENDING,
      });
    });
  });
});
