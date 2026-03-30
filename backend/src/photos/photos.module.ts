import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarPhoto } from '../entities/bar-photo.entity.js';
import { Bar } from '../entities/bar.entity.js';
import { PhotosService } from './photos.service.js';
import { PhotosController } from './photos.controller.js';
import { AwsModule } from '../external/aws/aws.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([BarPhoto, Bar]), AwsModule],
  controllers: [PhotosController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
