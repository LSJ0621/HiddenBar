import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '@my-project/shared';
import { AdminBarsQueryDto } from './dto/admin-bars-query.dto.js';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto.js';
import { AdminActionsQueryDto } from './dto/admin-actions-query.dto.js';
import { ApproveBarDto } from './dto/approve-bar.dto.js';
import { RejectBarDto } from './dto/reject-bar.dto.js';
import { DeleteBarDto } from './dto/delete-bar.dto.js';
import { SuspendUserDto } from './dto/suspend-user.dto.js';
import { ChangeRoleDto } from './dto/change-role.dto.js';
import { ModerateReviewDto } from '../reviews/dto/moderate-review.dto.js';
import { DeleteReviewDto } from './dto/delete-review.dto.js';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 대시보드 통계를 조회한다.
   */
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  /**
   * 관리자용 가게 목록을 조회한다.
   */
  @Get('bars')
  async findBars(@Query() query: AdminBarsQueryDto) {
    return this.adminService.findBars(query);
  }

  /**
   * 관리자용 가게 상세를 조회한다.
   */
  @Get('bars/:id')
  async findBarById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findBarById(id);
  }

  /**
   * 가게를 승인한다.
   */
  @Patch('bars/:id/approve')
  async approveBar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveBarDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.adminService.approveBar(id, user.id, dto.reason);
  }

  /**
   * 가게를 거절한다.
   */
  @Patch('bars/:id/reject')
  async rejectBar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectBarDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.adminService.rejectBar(id, user.id, dto.reason);
  }

  /**
   * 가게를 삭제한다 (soft delete).
   */
  @Delete('bars/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeleteBarDto,
    @CurrentUser() user: { id: number },
  ) {
    await this.adminService.deleteBar(id, user.id, dto.reason);
  }

  /**
   * 관리자용 유저 목록을 조회한다.
   */
  @Get('users')
  async findUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.findUsers(query);
  }

  /**
   * 관리자용 유저 상세를 조회한다.
   */
  @Get('users/:id')
  async findUserById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findUserById(id);
  }

  /**
   * 유저를 정지한다.
   */
  @Patch('users/:id/suspend')
  async suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuspendUserDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.adminService.suspendUser(id, user.id, dto.reason);
  }

  /**
   * 유저를 활성화한다.
   */
  @Patch('users/:id/activate')
  async activateUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.adminService.activateUser(id, user.id);
  }

  /**
   * 유저 역할을 변경한다.
   */
  @Patch('users/:id/role')
  async changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.adminService.changeUserRole(id, user.id, dto.role, dto.reason);
  }

  /**
   * 리뷰 상태를 변경한다 (moderation).
   */
  @Patch('reviews/:reviewId/status')
  async moderateReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: ModerateReviewDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.adminService.moderateReview(
      reviewId,
      dto.status,
      user.id,
      dto.reason,
    );
  }

  /**
   * 리뷰를 관리자 권한으로 삭제한다 (soft delete).
   */
  @Delete('reviews/:reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: DeleteReviewDto,
    @CurrentUser() user: { id: number },
  ) {
    await this.adminService.deleteReviewByAdmin(reviewId, user.id, dto.reason);
  }

  /**
   * 감사 로그 목록을 조회한다.
   */
  @Get('actions')
  async findActions(@Query() query: AdminActionsQueryDto) {
    return this.adminService.findActions(query);
  }
}
