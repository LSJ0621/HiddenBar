import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 공개 엔드포인트 데코레이터. APP_GUARD로 등록된 JwtAuthGuard를 건너뛴다.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
