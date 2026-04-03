import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from '../entities/review.entity.js';
import { ReviewPhoto } from '../entities/review-photo.entity.js';
import { ReviewStatsService } from './review-stats.service.js';
import { S3Client } from '../external/aws/clients/s3.client.js';
import { runInTransaction } from '../common/utils/transaction.js';
import { ReviewStatus } from '@my-project/shared';

/**
 * 리뷰 사진 업로드/삭제를 담당하는 서비스.
 */
@Injectable()
export class ReviewPhotosService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ReviewPhoto)
    private readonly reviewPhotoRepository: Repository<ReviewPhoto>,
    private readonly reviewStatsService: ReviewStatsService,
    private readonly dataSource: DataSource,
    private readonly s3Client: S3Client,
  ) {}

  /**
   * 리뷰 사진을 업로드한다.
   */
  async uploadPhotos(
    reviewId: number,
    files: Express.Multer.File[],
    user: { id: number },
  ): Promise<ReviewPhoto[]> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.userId !== user.id) {
      throw new ForbiddenException('You can only upload photos to your own review.');
    }

    const existingCount = await this.reviewPhotoRepository.count({
      where: { reviewId },
    });

    if (existingCount + files.length > 5) {
      throw new BadRequestException(
        'A review can have at most 5 photos.',
      );
    }

    const uploadResults = await Promise.allSettled(
      files.map((file) => this.s3Client.uploadReviewPhoto(file, reviewId)),
    );

    const successfulUploads: { url: string; s3Key: string; file: Express.Multer.File }[] = [];
    for (let i = 0; i < uploadResults.length; i++) {
      const result = uploadResults[i];
      if (result.status === 'fulfilled') {
        successfulUploads.push({ ...result.value, file: files[i] });
      }
    }

    if (successfulUploads.length === 0) {
      throw new BadRequestException('Failed to upload photos.');
    }

    const hadPhotos = review.photoCount > 0;

    try {
      return await runInTransaction(this.dataSource, async (manager) => {
        const photos: ReviewPhoto[] = [];
        for (let i = 0; i < successfulUploads.length; i++) {
          const { url, s3Key, file } = successfulUploads[i];
          const photo = manager.create(ReviewPhoto, {
            reviewId,
            url,
            s3Key,
            mimeType: file.mimetype || null,
            sizeBytes: file.size || null,
            sortOrder: existingCount + i,
          });
          photos.push(await manager.save(photo));
        }

        review.photoCount = existingCount + successfulUploads.length;
        await manager.save(review);

        if (
          !hadPhotos &&
          review.photoCount > 0 &&
          review.status === ReviewStatus.PUBLISHED
        ) {
          await this.reviewStatsService.adjustPhotoReviewCount(
            review.barId,
            1,
            manager,
          );
        }

        return photos;
      });
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Photo sort order conflict. Please retry.');
      }
      throw error;
    }
  }

  /**
   * 리뷰 사진을 삭제한다 (soft delete).
   */
  async removePhoto(
    reviewId: number,
    photoId: number,
    user: { id: number },
  ): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.userId !== user.id) {
      throw new ForbiddenException('You can only delete photos from your own review.');
    }

    const photo = await this.reviewPhotoRepository.findOne({
      where: { id: photoId, reviewId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }

    await runInTransaction(this.dataSource, async (manager) => {
      await manager.softRemove(photo);

      review.photoCount = Math.max(0, review.photoCount - 1);
      await manager.save(review);

      if (review.photoCount === 0 && review.status === ReviewStatus.PUBLISHED) {
        await this.reviewStatsService.adjustPhotoReviewCount(
          review.barId,
          -1,
          manager,
        );
      }
    });
  }
}
