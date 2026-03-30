import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReviewStatus } from '@my-project/shared';

/**
 * 관리자 리뷰 상태 변경 DTO.
 */
export class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
