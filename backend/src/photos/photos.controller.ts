import {
  Controller,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PhotosService } from './photos.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MULTER_OPTIONS } from '../common/config/multer.config.js';
import { ImageValidationPipe } from '../common/pipes/file-validation.pipe.js';

@Controller('bars/:id/photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  /**
   * 가게 사진을 업로드한다.
   */
  @Post()
  @UseInterceptors(FilesInterceptor('files', 5, MULTER_OPTIONS))
  async upload(
    @Param('id', ParseIntPipe) barId: number,
    @UploadedFiles(ImageValidationPipe) files: Express.Multer.File[],
    @CurrentUser() user: { id: number },
  ) {
    return this.photosService.upload(barId, files || [], user);
  }

  /**
   * 가게 사진을 삭제한다.
   */
  @Delete(':photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) barId: number,
    @Param('photoId', ParseIntPipe) photoId: number,
    @CurrentUser() user: { id: number },
  ) {
    await this.photosService.remove(barId, photoId, user);
  }
}
