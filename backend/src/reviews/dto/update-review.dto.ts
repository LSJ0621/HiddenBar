import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateReviewDto } from './create-review.dto.js';

/**
 * 리뷰 수정 DTO. barId는 수정 불가.
 */
export class UpdateReviewDto extends PartialType(
  OmitType(CreateReviewDto, ['barId'] as const),
) {}
