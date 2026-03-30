import { PartialType } from '@nestjs/mapped-types';
import { CreateBarDto } from './create-bar.dto.js';

/**
 * 가게 수정 DTO. CreateBarDto의 모든 필드를 Optional로 변환.
 */
export class UpdateBarDto extends PartialType(CreateBarDto) {}
