import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReviewStatsService } from './review-stats.service.js';
import { BarReviewStats } from '../entities/bar-review-stats.entity.js';

const mockStatsRepo = () => ({});

const mockManager = () => ({
  query: jest.fn(),
});

const mockDataSource = () => ({
  query: jest.fn(),
});

describe('ReviewStatsService', () => {
  let service: ReviewStatsService;
  let manager: ReturnType<typeof mockManager>;
  let dataSource: ReturnType<typeof mockDataSource>;

  beforeEach(async () => {
    manager = mockManager();
    dataSource = mockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewStatsService,
        { provide: getRepositoryToken(BarReviewStats), useFactory: mockStatsRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ReviewStatsService>(ReviewStatsService);
  });

  describe('incrementStats', () => {
    it('rating과 hasPhotos=true일 때 올바른 SQL 파라미터 [barId, rating, 1]로 호출한다', async () => {
      // Arrange
      const barId = 10;
      const rating = 3;

      // Act
      await service.incrementStats(barId, rating, true, manager as any);

      // Assert
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO bar_review_stats'),
        [barId, rating, 1],
      );
    });

    it('hasPhotos=false일 때 파라미터의 photoInc가 0이다', async () => {
      // Arrange
      const barId = 5;
      const rating = 4;

      // Act
      await service.incrementStats(barId, rating, false, manager as any);

      // Assert
      expect(manager.query).toHaveBeenCalledWith(
        expect.any(String),
        [barId, rating, 0],
      );
    });

    it('rating=1일 때 SQL에 "rating1Count" 컬럼이 포함된다', async () => {
      // Act
      await service.incrementStats(1, 1, false, manager as any);

      // Assert
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('"rating1Count"'),
        expect.any(Array),
      );
    });

    it('rating=5일 때 SQL에 "rating5Count" 컬럼이 포함된다', async () => {
      // Act
      await service.incrementStats(1, 5, false, manager as any);

      // Assert
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('"rating5Count"'),
        expect.any(Array),
      );
    });
  });

  describe('decrementStats', () => {
    it('rating과 hasPhotos=true일 때 올바른 SQL 파라미터 [barId, rating, 1]로 호출한다', async () => {
      // Arrange
      const barId = 10;
      const rating = 3;

      // Act
      await service.decrementStats(barId, rating, true, manager as any);

      // Assert
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bar_review_stats'),
        [barId, rating, 1],
      );
    });

    it('hasPhotos=false일 때 파라미터의 photoDec가 0이다', async () => {
      // Arrange
      const barId = 5;
      const rating = 2;

      // Act
      await service.decrementStats(barId, rating, false, manager as any);

      // Assert
      expect(manager.query).toHaveBeenCalledWith(
        expect.any(String),
        [barId, rating, 0],
      );
    });

    it('SQL에 GREATEST(0, ...) 음수 방지 로직이 포함된다', async () => {
      // Act
      await service.decrementStats(1, 3, false, manager as any);

      // Assert
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('GREATEST(0,'),
        expect.any(Array),
      );
    });
  });

  describe('adjustRating', () => {
    it('oldRating 컬럼 감소, newRating 컬럼 증가 SQL을 호출한다', async () => {
      // Arrange
      const barId = 1;
      const oldRating = 2;
      const newRating = 4;

      // Act
      await service.adjustRating(barId, oldRating, newRating, manager as any);

      // Assert
      const sql = manager.query.mock.calls[0][0] as string;
      expect(sql).toContain('"rating2Count"');
      expect(sql).toContain('"rating4Count"');
      expect(sql).toContain('GREATEST(0,');
    });

    it('파라미터가 [barId, oldRating, newRating] 순서로 전달된다', async () => {
      // Arrange
      const barId = 7;
      const oldRating = 1;
      const newRating = 5;

      // Act
      await service.adjustRating(barId, oldRating, newRating, manager as any);

      // Assert
      expect(manager.query).toHaveBeenCalledWith(
        expect.any(String),
        [barId, oldRating, newRating],
      );
    });
  });

  describe('adjustPhotoReviewCount', () => {
    it('양수 delta로 photoReviewCount를 증가시킨다', async () => {
      // Act
      await service.adjustPhotoReviewCount(1, 1, manager as any);

      // Assert
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('"photoReviewCount"'),
        [1, 1],
      );
    });

    it('음수 delta를 전달할 수 있다', async () => {
      // Act
      await service.adjustPhotoReviewCount(1, -1, manager as any);

      // Assert
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('GREATEST(0,'),
        [1, -1],
      );
    });
  });

  describe('recalculate', () => {
    it('dataSource.query를 barId 파라미터로 호출한다', async () => {
      // Act
      await service.recalculate(42);

      // Assert
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        [42],
      );
    });

    it('SQL에 PUBLISHED와 deletedAt IS NULL 조건이 포함된다', async () => {
      // Act
      await service.recalculate(1);

      // Assert
      const sql = dataSource.query.mock.calls[0][0] as string;
      expect(sql).toContain('PUBLISHED');
      expect(sql).toContain('"deletedAt" IS NULL');
    });
  });
});
