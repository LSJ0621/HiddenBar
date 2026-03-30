import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Multer 파일 업로드 설정.
 * - 파일 당 최대 5MB
 * - 요청 당 최대 5개 파일
 */
export const MULTER_OPTIONS: MulterOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5,
    fieldNameSize: 100,
    fieldSize: 1024 * 1024,
    fields: 100,
  },
};
