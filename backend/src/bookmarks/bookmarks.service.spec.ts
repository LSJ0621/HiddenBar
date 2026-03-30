import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { Bar } from '../entities/bar.entity.js';
import { BarStatus } from '@my-project/shared';

const mockBookmarkRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn((dto: any) => dto),
  save: jest.fn((entity: any) => Promise.resolve({ id: 1, ...entity })),
  restore: jest.fn().mockResolvedValue({ affected: 1 }),
  softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockBarRepository = () => ({
  findOne: jest.fn(),
});

describe('BookmarksService', () => {
  let service: BookmarksService;
  let bookmarkRepo: ReturnType<typeof mockBookmarkRepository>;
  let barRepo: ReturnType<typeof mockBarRepository>;

  const mockUser = { id: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarksService,
        {
          provide: getRepositoryToken(Bookmark),
          useFactory: mockBookmarkRepository,
        },
        { provide: getRepositoryToken(Bar), useFactory: mockBarRepository },
      ],
    }).compile();

    service = module.get<BookmarksService>(BookmarksService);
    bookmarkRepo = module.get(getRepositoryToken(Bookmark));
    barRepo = module.get(getRepositoryToken(Bar));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── add ─────────────────────────────────────────────

  describe('add', () => {
    it('북마크가 없을 때 add()를 호출하면 새 북마크를 생성하고 isBookmarked: true를 반환한다', async () => {
      // Arrange
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.APPROVED });
      // 현재 활성 북마크 없음
      bookmarkRepo.findOne.mockResolvedValueOnce(null);
      // soft-deleted 북마크도 없음
      bookmarkRepo.findOne.mockResolvedValueOnce(null);
      bookmarkRepo.count.mockResolvedValue(5);

      // Act
      const result = await service.add(1, mockUser.id);

      // Assert
      expect(result.isBookmarked).toBe(true);
      expect(result.bookmarkCount).toBe(5);
      expect(bookmarkRepo.save).toHaveBeenCalled();
    });

    it('add()는 항상 응답에 bookmarkCount를 포함한다', async () => {
      // Arrange
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.APPROVED });
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.count.mockResolvedValue(3);

      // Act
      const result = await service.add(1, mockUser.id);

      // Assert
      expect(result).toHaveProperty('bookmarkCount');
      expect(typeof result.bookmarkCount).toBe('number');
    });

    it('이미 북마크가 존재할 때 add()를 호출하면 중복 저장 없이 isBookmarked: true와 동일한 카운트를 반환한다 (멱등성)', async () => {
      // Arrange
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.APPROVED });
      // 현재 활성 북마크 이미 존재
      bookmarkRepo.findOne.mockResolvedValue({
        id: 1,
        userId: mockUser.id,
        barId: 1,
        deletedAt: null,
      });
      bookmarkRepo.count.mockResolvedValue(10);

      // Act
      const result = await service.add(1, mockUser.id);

      // Assert
      expect(result.isBookmarked).toBe(true);
      expect(result.bookmarkCount).toBe(10);
      // 이미 존재하므로 save가 호출되지 않아야 한다
      expect(bookmarkRepo.save).not.toHaveBeenCalled();
    });

    it('soft-delete된 북마크가 있을 때 add()를 호출하면 restore하고 isBookmarked: true를 반환한다', async () => {
      // Arrange
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.APPROVED });
      // 활성 북마크 없음
      bookmarkRepo.findOne.mockResolvedValueOnce(null);
      // soft-deleted 북마크 존재
      bookmarkRepo.findOne.mockResolvedValueOnce({
        id: 7,
        userId: mockUser.id,
        barId: 1,
        deletedAt: new Date('2026-01-01'),
      });
      bookmarkRepo.count.mockResolvedValue(4);

      // Act
      const result = await service.add(1, mockUser.id);

      // Assert
      expect(result.isBookmarked).toBe(true);
      expect(bookmarkRepo.restore).toHaveBeenCalledWith(7);
      // 새 레코드를 생성하면 안 된다
      expect(bookmarkRepo.save).not.toHaveBeenCalled();
    });

    it('APPROVED 상태가 아닌 바에 add()를 호출하면 NotFoundException을 던진다', async () => {
      // Arrange: barRepository가 null을 반환하면 APPROVED 바 없음
      barRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.add(999, mockUser.id)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ─────────────────────────────────────────────

  describe('remove', () => {
    it('활성 북마크가 있을 때 remove()를 호출하면 soft-delete하고 isBookmarked: false를 반환한다', async () => {
      // Arrange
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.APPROVED });
      bookmarkRepo.findOne.mockResolvedValue({
        id: 3,
        userId: mockUser.id,
        barId: 1,
        deletedAt: null,
      });
      bookmarkRepo.count.mockResolvedValue(9);

      // Act
      const result = await service.remove(1, mockUser.id);

      // Assert
      expect(result.isBookmarked).toBe(false);
      expect(result.bookmarkCount).toBe(9);
      expect(bookmarkRepo.softDelete).toHaveBeenCalledWith(3);
    });

    it('remove()는 항상 응답에 bookmarkCount를 포함한다', async () => {
      // Arrange
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.APPROVED });
      bookmarkRepo.findOne.mockResolvedValue({
        id: 3,
        userId: mockUser.id,
        barId: 1,
        deletedAt: null,
      });
      bookmarkRepo.count.mockResolvedValue(0);

      // Act
      const result = await service.remove(1, mockUser.id);

      // Assert
      expect(result).toHaveProperty('bookmarkCount');
      expect(typeof result.bookmarkCount).toBe('number');
    });

    it('북마크가 존재하지 않을 때 remove()를 호출하면 softDelete 없이 isBookmarked: false를 반환한다 (멱등성)', async () => {
      // Arrange
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.APPROVED });
      // 활성 북마크 없음
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.count.mockResolvedValue(2);

      // Act
      const result = await service.remove(1, mockUser.id);

      // Assert
      expect(result.isBookmarked).toBe(false);
      expect(result.bookmarkCount).toBe(2);
      expect(bookmarkRepo.softDelete).not.toHaveBeenCalled();
    });

    it('북마크가 없는 바에 remove()를 호출해도 에러 없이 isBookmarked: false를 반환한다 (멱등성)', async () => {
      // Arrange: 활성 북마크 없음
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.count.mockResolvedValue(0);

      // Act
      const result = await service.remove(999, mockUser.id);

      // Assert
      expect(result.isBookmarked).toBe(false);
      expect(result.bookmarkCount).toBe(0);
      expect(bookmarkRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  // ─── findUserBookmarks ──────────────────────────────────

  describe('findUserBookmarks', () => {
    it('북마크된 바 목록을 페이지네이션하여 플래트닝된 형태로 반환한다', async () => {
      const mockDate = new Date();
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 1,
              userId: 1,
              barId: 1,
              createdAt: mockDate,
              bar: {
                id: 1,
                name: 'The Secret Bar',
                city: 'Bangkok',
                country: 'Thailand',

                photos: [
                  { url: 'http://photo2.jpg', order: 1 },
                  { url: 'http://photo1.jpg', order: 0 },
                ],
                bookmarkCount: 42,
              },
            },
          ],
          1,
        ]),
      };
      bookmarkRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findUserBookmarks(mockUser.id, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
      expect(result.items[0]).toEqual({
        id: 1,
        name: 'The Secret Bar',
        city: 'Bangkok',
        country: 'Thailand',
        thumbnail: 'http://photo1.jpg',
        bookmarkCount: 42,
        averageRating: 0,
        reviewCount: 0,
        bookmarkedAt: mockDate,
      });
      expect(result.items[0]).not.toHaveProperty('bar');
    });

    it('reviewStats가 있으면 averageRating과 reviewCount를 포함한다', async () => {
      // Arrange: reviewStats가 있는 경우
      const mockDate = new Date();
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 1,
              userId: 1,
              barId: 1,
              createdAt: mockDate,
              bar: {
                id: 1,
                name: 'The Secret Bar',
                city: 'Bangkok',
                country: 'Thailand',

                photos: [{ url: 'http://photo1.jpg', order: 0 }],
                bookmarkCount: 10,
                reviewStats: { ratingAvg: '4.2', reviewCount: 35 },
              },
            },
          ],
          1,
        ]),
      };
      bookmarkRepo.createQueryBuilder.mockReturnValue(qb);

      // Act
      const result = await service.findUserBookmarks(mockUser.id, {
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.items[0]).toHaveProperty('averageRating');
      expect(result.items[0]).toHaveProperty('reviewCount');
      expect(typeof result.items[0].averageRating).toBe('number');
      expect(result.items[0].averageRating).toBeCloseTo(4.2);
      expect(result.items[0].reviewCount).toBe(35);
    });

    it('reviewStats가 없으면 averageRating=0, reviewCount=0을 반환한다', async () => {
      // Arrange: reviewStats가 없는 경우
      const mockDate = new Date();
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 2,
              userId: 1,
              barId: 2,
              createdAt: mockDate,
              bar: {
                id: 2,
                name: 'New Bar',
                city: 'Bangkok',
                country: 'Thailand',
                photos: [],
                bookmarkCount: 0,
                reviewStats: null,
              },
            },
          ],
          1,
        ]),
      };
      bookmarkRepo.createQueryBuilder.mockReturnValue(qb);

      // Act
      const result = await service.findUserBookmarks(mockUser.id, {
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.items[0].averageRating).toBe(0);
      expect(result.items[0].reviewCount).toBe(0);
    });
  });
});
