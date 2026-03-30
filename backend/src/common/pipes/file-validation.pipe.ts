import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validateImageMagicBytes } from '../utils/file-validation.util.js';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * 이미지 파일 유효성 검사 파이프.
 * MIME 타입과 magic bytes를 검증한다.
 */
@Injectable()
export class ImageValidationPipe implements PipeTransform {
  private readonly maxSize = MAX_FILE_SIZE_BYTES;
  private readonly allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  transform(value: Express.Multer.File | Express.Multer.File[]) {
    if (!value) return value;

    const files = Array.isArray(value) ? value : [value];
    for (const file of files) {
      if (file.size > this.maxSize) {
        throw new BadRequestException(
          `File ${file.originalname} exceeds the 5MB size limit.`,
        );
      }

      if (!this.allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file format for ${file.originalname}: ${file.mimetype}`,
        );
      }

      if (!validateImageMagicBytes(file.buffer)) {
        throw new BadRequestException(
          `File ${file.originalname} is not a valid image.`,
        );
      }
    }
    return value;
  }
}
