import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bar } from '../entities/bar.entity.js';
import { BarPhoto } from '../entities/bar-photo.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Bar, BarPhoto, Bookmark]), AuthModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
