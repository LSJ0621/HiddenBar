import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarPhoto } from '../entities/bar-photo.entity.js';
import { Bar } from '../entities/bar.entity.js';
import { S3Client } from '../external/aws/clients/s3.client.js';

const MAX_PHOTOS_PER_BAR = 5;

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    @InjectRepository(BarPhoto)
    private readonly barPhotoRepository: Repository<BarPhoto>,
    @InjectRepository(Bar)
    private readonly barRepository: Repository<Bar>,
    private readonly s3Client: S3Client,
  ) {}

  /**
   * 가게 사진을 업로드한다.
   */
  async upload(
    barId: number,
    files: Express.Multer.File[],
    user: { id: number },
  ): Promise<{ photos: BarPhoto[]; failedCount: number }> {
    const bar = await this.barRepository.findOne({ where: { id: barId } });
    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }
    if (bar.ownerId !== user.id) {
      throw new ForbiddenException(
        'Only the bar owner can upload photos.',
      );
    }

    const existingCount = await this.barPhotoRepository.count({
      where: { barId },
    });
    if (existingCount + files.length > MAX_PHOTOS_PER_BAR) {
      throw new BadRequestException(
        `Maximum of ${MAX_PHOTOS_PER_BAR} photos allowed per bar.`,
      );
    }

    const uploadResults = await Promise.allSettled(
      files.map((file) => this.s3Client.uploadBarPhoto(file, barId)),
    );

    const photos: BarPhoto[] = [];
    let failedCount = 0;
    for (let i = 0; i < uploadResults.length; i++) {
      const result = uploadResults[i];
      if (result.status === 'fulfilled') {
        const photo = this.barPhotoRepository.create({
          url: result.value,
          order: existingCount + i,
          barId,
        });
        const saved = await this.barPhotoRepository.save(photo);
        photos.push(saved);
      } else {
        failedCount++;
        this.logger.error(
          `사진 업로드 실패 [barId=${barId}, index=${i}]: ${result.reason}`,
        );
      }
    }

    if (photos.length === 0 && files.length > 0) {
      this.logger.error(
        `모든 사진 업로드 실패 [barId=${barId}, fileCount=${files.length}]`,
      );
      throw new BadGatewayException('All photo uploads failed.');
    }

    return { photos, failedCount };
  }

  /**
   * 가게 사진을 삭제한다.
   */
  async remove(
    barId: number,
    photoId: number,
    user: { id: number },
  ): Promise<void> {
    const bar = await this.barRepository.findOne({ where: { id: barId } });
    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }
    if (bar.ownerId !== user.id) {
      throw new ForbiddenException('Only the bar owner can delete photos.');
    }

    const photo = await this.barPhotoRepository.findOne({
      where: { id: photoId, barId },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }

    await this.s3Client.deleteObject(photo.url);
    await this.barPhotoRepository.softDelete(photoId);
  }
}
