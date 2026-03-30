import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MapsService } from './maps.service.js';
import { AddressSearchService } from './address-search.service.js';
import { DirectionsDto } from './dto/directions.dto.js';
import { SearchAddressDto } from './dto/search-address.dto.js';
import { UserThrottlerGuard } from '../common/guards/user-throttler.guard.js';

/**
 * 지도/길안내 컨트롤러. 인증 필수. 사용자 기준 10회/분 rate limit.
 */
@Controller('maps')
@UseGuards(UserThrottlerGuard)
export class MapsController {
  constructor(
    private readonly mapsService: MapsService,
    private readonly addressSearchService: AddressSearchService,
  ) {}

  /**
   * 길안내를 조회한다. Google Routes API v2 프록시.
   */
  @Get('directions')
  async getDirections(@Query() query: DirectionsDto) {
    return this.mapsService.getDirections(query);
  }

  /**
   * 주소를 검색하여 장소 목록을 반환한다. Google Places API v1 프록시.
   */
  @Get('address/search')
  async searchAddress(@Query() query: SearchAddressDto) {
    const results = await this.addressSearchService.search(
      query.query,
      query.language,
    );
    return { results };
  }
}
