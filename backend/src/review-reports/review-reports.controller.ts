import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ReviewReportsService } from './review-reports.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ListReportsQueryDto } from './dto/list-reports-query.dto.js';
import { ResolveReportDto } from './dto/resolve-report.dto.js';
import { Role } from '@my-project/shared';

/**
 * 리뷰 신고 컨트롤러. 사용자 신고 접수 및 관리자 신고 관리 API를 제공한다.
 */
@Controller()
export class ReviewReportsController {
  constructor(private readonly reviewReportsService: ReviewReportsService) {}

  /**
   * 리뷰 신고를 접수한다.
   */
  @Post('reviews/:reviewId/report')
  async submitReport(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.reviewReportsService.submitReport(reviewId, user.id, dto);
  }

  /**
   * 관리자용 신고 목록을 조회한다.
   */
  @Get('admin/review-reports')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findReports(@Query() query: ListReportsQueryDto) {
    return this.reviewReportsService.findReports(query);
  }

  /**
   * 관리자용 신고 상세를 조회한다.
   */
  @Get('admin/review-reports/:reportId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findReportById(@Param('reportId', ParseIntPipe) reportId: number) {
    return this.reviewReportsService.findReportById(reportId);
  }

  /**
   * 관리자가 신고를 처리한다.
   */
  @Patch('admin/review-reports/:reportId/resolve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async resolveReport(
    @Param('reportId', ParseIntPipe) reportId: number,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.reviewReportsService.resolveReport(reportId, user.id, dto);
  }
}
