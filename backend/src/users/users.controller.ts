import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MULTER_OPTIONS } from '../common/config/multer.config.js';
import { ImageValidationPipe } from '../common/pipes/file-validation.pipe.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 내 프로필 조회.
   */
  @Get('me')
  async getProfile(@CurrentUser() user: { id: number }) {
    return this.usersService.getProfile(user.id);
  }

  /**
   * 내 프로필 수정.
   */
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  /**
   * 프로필 이미지 업로드.
   */
  @Post('me/profile-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', MULTER_OPTIONS))
  async uploadProfileImage(
    @CurrentUser() user: { id: number },
    @UploadedFile(ImageValidationPipe) file: Express.Multer.File,
  ) {
    return this.usersService.uploadProfileImage(user.id, file);
  }

  /**
   * 비밀번호 변경.
   */
  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: { id: number },
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.id, dto);
  }
}
