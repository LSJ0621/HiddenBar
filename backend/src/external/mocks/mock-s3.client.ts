import { Injectable, Logger } from '@nestjs/common';

/**
 * 테스트용 Mock S3 클라이언트.
 * S3Client와 동일한 인터페이스를 제공한다.
 */
@Injectable()
export class MockS3Client {
  private readonly logger = new Logger(MockS3Client.name);

  async uploadBarPhoto(file: Express.Multer.File, barId: number): Promise<string> {
    this.logger.log(
      `[MOCK] S3 uploadBarPhoto: barId=${barId}, filename="${file.originalname}", size=${file.size}`,
    );
    const timestamp = Date.now();
    return `https://mock-s3.example.com/hiddenbar/bars/${barId}/${timestamp}-${file.originalname}`;
  }

  async uploadProfilePhoto(file: Express.Multer.File, userId: number): Promise<string> {
    this.logger.log(
      `[MOCK] S3 uploadProfilePhoto: userId=${userId}, filename="${file.originalname}", size=${file.size}`,
    );
    const timestamp = Date.now();
    return `https://mock-s3.example.com/hiddenbar/profiles/${userId}/${timestamp}-${file.originalname}`;
  }

  async uploadReviewPhoto(
    file: Express.Multer.File,
    reviewId: number,
  ): Promise<{ url: string; s3Key: string }> {
    this.logger.log(
      `[MOCK] S3 uploadReviewPhoto: reviewId=${reviewId}, filename="${file.originalname}", size=${file.size}`,
    );
    const timestamp = Date.now();
    const s3Key = `hiddenbar/reviews/${reviewId}/${timestamp}-${file.originalname}`;
    return {
      url: `https://mock-s3.example.com/${s3Key}`,
      s3Key,
    };
  }

  async deleteObject(url: string): Promise<void> {
    this.logger.log(`[MOCK] S3 deleteObject: ${url}`);
  }
}
