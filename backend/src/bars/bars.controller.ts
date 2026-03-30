import {
  Controller,
  Get,
  Post,
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
import { Role } from '@my-project/shared';
import { BarsService } from './bars.service.js';
import { CreateBarDto } from './dto/create-bar.dto.js';
import { UpdateBarDto } from './dto/update-bar.dto.js';
import { MyBarsQueryDto } from './dto/my-bars-query.dto.js';
import { NearbyBarsDto } from './dto/nearby-bars.dto.js';
import { BarOwnerGuard } from './guards/bar-owner.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserThrottlerGuard } from '../common/guards/user-throttler.guard.js';

@Controller('bars')
export class BarsController {
  constructor(private readonly barsService: BarsService) {}

  /**
   * 가게를 등록한다.
   */
  @Post()
  async create(@Body() dto: CreateBarDto, @CurrentUser() user: { id: number }) {
    return this.barsService.create(dto, user);
  }

  /**
   * 내가 등록한 가게 목록을 조회한다.
   * NOTE: /my 경로가 /:id 보다 먼저 매칭되어야 하므로 상위에 배치.
   */
  @Get('my')
  async findMyBars(
    @CurrentUser() user: { id: number },
    @Query() query: MyBarsQueryDto,
  ) {
    return this.barsService.findMyBars(user.id, query);
  }

  /**
   * 주변 가게를 검색한다. 인증 필수. 사용자 기준 10회/분 rate limit.
   */
  @Get('nearby')
  @UseGuards(UserThrottlerGuard)
  async findNearby(@Query() query: NearbyBarsDto) {
    return this.barsService.findNearby(query);
  }

  /**
   * 가게 상세를 조회한다.
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    return this.barsService.findOne(id, user);
  }

  /**
   * 가게 정보를 수정한다.
   */
  @Patch(':id')
  @UseGuards(BarOwnerGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBarDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.barsService.update(id, dto, user);
  }

  /**
   * 가게를 삭제한다 (소프트 삭제).
   */
  @Delete(':id')
  @UseGuards(BarOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    await this.barsService.remove(id, user);
  }
}
