import {
  Controller,
  Put,
  Delete,
  Get,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Controller()
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  /**
   * 북마크를 추가한다 (멱등).
   */
  @Put('bars/:id/bookmark')
  @HttpCode(HttpStatus.OK)
  async add(
    @Param('id', ParseIntPipe) barId: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.bookmarksService.add(barId, user.id);
  }

  /**
   * 북마크를 제거한다 (멱등).
   */
  @Delete('bars/:id/bookmark')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseIntPipe) barId: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.bookmarksService.remove(barId, user.id);
  }

  /**
   * 내 북마크 목록을 조회한다.
   */
  @Get('users/me/bookmarks')
  async findUserBookmarks(
    @CurrentUser() user: { id: number },
    @Query() query: PaginationDto,
  ) {
    return this.bookmarksService.findUserBookmarks(user.id, query);
  }
}
