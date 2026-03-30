import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bar } from '../entities/bar.entity.js';
import { MenuItem } from '../entities/menu-item.entity.js';
import { OperatingHours } from '../entities/operating-hours.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { BarsService } from './bars.service.js';
import { BarsController } from './bars.controller.js';
import { BarOwnerGuard } from './guards/bar-owner.guard.js';
import { UserThrottlerGuard } from '../common/guards/user-throttler.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bar, MenuItem, OperatingHours, Bookmark]),
  ],
  controllers: [BarsController],
  providers: [BarsService, BarOwnerGuard, UserThrottlerGuard],
  exports: [BarsService],
})
export class BarsModule {}
