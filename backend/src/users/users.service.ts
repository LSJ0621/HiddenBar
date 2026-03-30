import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity.js';
import { BCRYPT_SALT_ROUNDS } from '../common/config/configuration.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { S3Client } from '../external/aws/clients/s3.client.js';
import { toUserInfo } from '../common/utils/user-mapper.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly s3Client: S3Client,
  ) {}

  /**
   * 사용자 프로필을 조회한다.
   */
  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return toUserInfo(user);
  }

  /**
   * 사용자 프로필을 수정한다.
   */
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (dto.name !== undefined) {
      user.name = dto.name;
    }

    const updated = await this.userRepository.save(user);
    return toUserInfo(updated);
  }

  /**
   * 프로필 이미지를 S3에 업로드하고 사용자 정보를 업데이트한다.
   */
  async uploadProfileImage(userId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const oldImage = user.profileImage;

    const url = await this.s3Client.uploadProfilePhoto(file, userId);
    user.profileImage = url;
    const updated = await this.userRepository.save(user);

    if (oldImage && oldImage.includes('s3.')) {
      try {
        await this.s3Client.deleteObject(oldImage);
      } catch (error) {
        this.logger.warn(
          `기존 프로필 이미지 삭제 실패 [userId=${userId}]: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return toUserInfo(updated);
  }

  /**
   * 비밀번호를 변경한다.
   */
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.passwordHash === null) {
      throw new ForbiddenException(
        'Social login accounts cannot change password.',
      );
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    const isSame = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException(
        'New password must be different from the current password.',
      );
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.save(user);
  }

}
