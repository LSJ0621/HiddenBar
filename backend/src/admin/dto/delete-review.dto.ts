import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 관리자 리뷰 삭제 DTO.
 */
export class DeleteReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
