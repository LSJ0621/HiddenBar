import {
  S3Client as AwsS3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  S3_BAR_PHOTO_PREFIX,
  S3_PROFILE_PHOTO_PREFIX,
  S3_REVIEW_PHOTO_PREFIX,
} from '../aws.constants.js';

@Injectable()
export class S3Client {
  private readonly logger = new Logger(S3Client.name);
  private readonly s3Client: AwsS3Client | null = null;
  private readonly bucketName: string = '';
  private readonly region: string = '';
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
    );
    const bucket = this.configService.get<string>('aws.s3Bucket');
    const region = this.configService.get<string>('aws.s3Region');

    if (accessKeyId && secretAccessKey && bucket && region) {
      this.bucketName = bucket;
      this.region = region;
      this.s3Client = new AwsS3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.enabled = true;
    } else {
      this.logger.warn(
        'AWS S3 환경변수가 설정되지 않았습니다. S3 기능이 비활성화됩니다.',
      );
      this.enabled = false;
    }
  }

  /**
   * 파일명에서 안전한 확장자를 추출한다 (Path Traversal 방어).
   */
  private extractSafeFileExtension(originalName: string): string {
    if (
      originalName.includes('../') ||
      originalName.includes('..\\') ||
      originalName.includes('\0')
    ) {
      throw new BadRequestException('Invalid file name.');
    }

    const safeFilename = path.basename(originalName);
    if (!safeFilename || safeFilename === '.' || safeFilename === '..') {
      throw new BadRequestException('Invalid file name.');
    }

    const ext = safeFilename.split('.').pop()?.toLowerCase();
    const ALLOWED = ['jpg', 'jpeg', 'png', 'webp'];

    if (!ext || ext === safeFilename || !ALLOWED.includes(ext)) {
      return 'jpg';
    }

    return ext;
  }

  /**
   * 바 사진을 S3에 업로드하고 URL을 반환한다.
   */
  async uploadBarPhoto(
    file: Express.Multer.File,
    barId: number,
  ): Promise<string> {
    if (!this.enabled || !this.s3Client) {
      throw new BadRequestException(
        'File upload is unavailable because S3 is not configured.',
      );
    }

    const ext = this.extractSafeFileExtension(file.originalname);
    const key = `${S3_BAR_PHOTO_PREFIX}/${barId}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || 'image/jpeg',
    });

    await this.s3Client.send(command);

    const url = `https://s3.${this.region}.amazonaws.com/${this.bucketName}/${key}`;
    this.logger.debug(`Bar photo uploaded: ${key}`);
    return url;
  }

  /**
   * 프로필 사진을 S3에 업로드하고 URL을 반환한다.
   */
  async uploadProfilePhoto(
    file: Express.Multer.File,
    userId: number,
  ): Promise<string> {
    if (!this.enabled || !this.s3Client) {
      throw new BadRequestException(
        'File upload is unavailable because S3 is not configured.',
      );
    }

    const ext = this.extractSafeFileExtension(file.originalname);
    const key = `${S3_PROFILE_PHOTO_PREFIX}/${userId}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || 'image/jpeg',
    });

    await this.s3Client.send(command);

    const url = `https://s3.${this.region}.amazonaws.com/${this.bucketName}/${key}`;
    this.logger.debug(`Profile photo uploaded: ${key}`);
    return url;
  }

  /**
   * 리뷰 사진을 S3에 업로드하고 URL과 S3 키를 반환한다.
   */
  async uploadReviewPhoto(
    file: Express.Multer.File,
    reviewId: number,
  ): Promise<{ url: string; s3Key: string }> {
    if (!this.enabled || !this.s3Client) {
      throw new BadRequestException(
        'File upload is unavailable because S3 is not configured.',
      );
    }

    const ext = this.extractSafeFileExtension(file.originalname);
    const key = `${S3_REVIEW_PHOTO_PREFIX}/${reviewId}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || 'image/jpeg',
    });

    await this.s3Client.send(command);

    const url = `https://s3.${this.region}.amazonaws.com/${this.bucketName}/${key}`;
    this.logger.debug(`Review photo uploaded: ${key}`);
    return { url, s3Key: key };
  }

  /**
   * S3에서 파일을 삭제한다.
   */
  async deleteObject(url: string): Promise<void> {
    if (!this.enabled || !this.s3Client) {
      this.logger.warn('S3가 비활성화되어 삭제를 건너뜁니다.');
      return;
    }

    const urlObj = new URL(url);
    const key = urlObj.pathname.slice(1).replace(`${this.bucketName}/`, '');

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
    this.logger.debug(`S3 object deleted: ${key}`);
  }
}
