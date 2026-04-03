import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReviewsService } from './reviews.service.js';
import { ReviewPhotosService } from './review-photos.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MULTER_OPTIONS } from '../common/config/multer.config.js';
import { ImageValidationPipe } from '../common/pipes/file-validation.pipe.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto.js';
import { Role } from '@my-project/shared';

@Controller()
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly reviewPhotosService: ReviewPhotosService,
  ) {}

  /**
   * 리뷰를 생성한다.
   */
  @Post('reviews')
  async create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.reviewsService.create(dto, user);
  }

  /**
   * 바별 리뷰 목록을 조회한다.
   */
  @Get('bars/:barId/reviews')
  async findByBarId(
    @Param('barId', ParseIntPipe) barId: number,
    @Query() query: ListReviewsQueryDto,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    return this.reviewsService.findByBarId(barId, query, user);
  }

  /**
   * 내 리뷰를 조회한다.
   */
  @Get('bars/:barId/my-review')
  async findMyReview(
    @Param('barId', ParseIntPipe) barId: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.reviewsService.findMyReview(barId, user.id);
  }

  /**
   * 리뷰를 수정한다.
   */
  @Patch('reviews/:reviewId')
  async update(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.reviewsService.update(reviewId, dto, user);
  }

  /**
   * 리뷰를 삭제한다 (soft delete).
   */
  @Delete('reviews/:reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @CurrentUser() user: { id: number },
  ) {
    await this.reviewsService.remove(reviewId, user);
  }

  /**
   * 리뷰 사진을 업로드한다.
   */
  @Post('reviews/:reviewId/photos')
  @UseInterceptors(FilesInterceptor('files', 5, MULTER_OPTIONS))
  async uploadPhotos(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @UploadedFiles(ImageValidationPipe) files: Express.Multer.File[],
    @CurrentUser() user: { id: number },
  ) {
    return this.reviewPhotosService.uploadPhotos(reviewId, files || [], user);
  }

  /**
   * 리뷰 사진을 삭제한다.
   */
  @Delete('reviews/:reviewId/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePhoto(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Param('photoId', ParseIntPipe) photoId: number,
    @CurrentUser() user: { id: number },
  ) {
    await this.reviewPhotosService.removePhoto(reviewId, photoId, user);
  }
}
