import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { SearchBarsDto } from './dto/search-bars.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

/**
 * 바 검색 컨트롤러. 인증 필수. 결과에 isBookmarked 포함.
 */
@Controller('bars')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 바 검색 (주소/이름/복합 모드).
   */
  @Get('search')
  async search(
    @Query() dto: SearchBarsDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.searchService.search(dto, user.id);
  }
}
