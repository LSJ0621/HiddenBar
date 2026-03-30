import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MapsController } from './maps.controller.js';
import { MapsService } from './maps.service.js';
import { AddressSearchService } from './address-search.service.js';
import { GoogleModule } from '../external/google/google.module.js';
import { UserThrottlerGuard } from '../common/guards/user-throttler.guard.js';

@Module({
  imports: [HttpModule, GoogleModule],
  controllers: [MapsController],
  providers: [MapsService, AddressSearchService, UserThrottlerGuard],
})
export class MapsModule {}
