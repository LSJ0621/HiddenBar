import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { User } from '../entities/user.entity.js';
import { S3Client } from '../external/aws/clients/s3.client.js';
import { Role } from '@my-project/shared';
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../common/config/configuration.js';

jest.mock('bcrypt');

const mockUserRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn((entity) => Promise.resolve(entity)),
});

const mockS3Client = () => ({
  uploadProfilePhoto: jest.fn(),
  deleteObject: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let s3: ReturnType<typeof mockS3Client>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    passwordHash: 'hashed-pw',
    name: 'Test',
    profileImage: null,
    role: Role.USER,
    isActive: true,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        { provide: S3Client, useFactory: mockS3Client },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    s3 = module.get(S3Client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── getProfile ─────────────────────────────────────

  describe('getProfile', () => {
    it('should return user profile for authenticated user', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });

    it('should include id, email, name, profileImage, role, createdAt, hasPassword', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('profileImage');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('hasPassword');
      expect(result.hasPassword).toBe(true);
    });

    it('should return hasPassword false for social login user', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, passwordHash: null });

      const result = await service.getProfile(1);

      expect(result.hasPassword).toBe(false);
    });
  });

  // ─── updateProfile ──────────────────────────────────

  describe('updateProfile', () => {
    it('should update name successfully', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      userRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateProfile(1, { name: 'NewName' });

      expect(result.name).toBe('NewName');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile(999, { name: 'NewName' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return updated user profile', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      userRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateProfile(1, { name: 'Updated' });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
    });
  });

  // ─── uploadProfileImage ─────────────────────────────

  describe('uploadProfileImage', () => {
    const mockFile = {
      originalname: 'photo.jpg',
      buffer: Buffer.from('test'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('should upload file to S3 and update user profileImage', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, profileImage: null });
      userRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      s3.uploadProfilePhoto.mockResolvedValue(
        'https://s3.ap-northeast-2.amazonaws.com/bucket/hiddenbar/profiles/1/uuid.jpg',
      );

      const result = await service.uploadProfileImage(1, mockFile);

      expect(s3.uploadProfilePhoto).toHaveBeenCalledWith(mockFile, 1);
      expect(result.profileImage).toBe(
        'https://s3.ap-northeast-2.amazonaws.com/bucket/hiddenbar/profiles/1/uuid.jpg',
      );
    });

    it('should delete old S3 image after uploading new one', async () => {
      const oldUrl =
        'https://s3.ap-northeast-2.amazonaws.com/bucket/hiddenbar/profiles/1/old.jpg';
      userRepo.findOne.mockResolvedValue({ ...mockUser, profileImage: oldUrl });
      userRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      s3.uploadProfilePhoto.mockResolvedValue(
        'https://s3.ap-northeast-2.amazonaws.com/bucket/hiddenbar/profiles/1/new.jpg',
      );

      await service.uploadProfileImage(1, mockFile);

      expect(s3.uploadProfilePhoto).toHaveBeenCalled();
      expect(s3.deleteObject).toHaveBeenCalledWith(oldUrl);
    });

    it('should succeed even if old image deletion fails', async () => {
      const oldUrl =
        'https://s3.ap-northeast-2.amazonaws.com/bucket/hiddenbar/profiles/1/old.jpg';
      userRepo.findOne.mockResolvedValue({ ...mockUser, profileImage: oldUrl });
      userRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      s3.uploadProfilePhoto.mockResolvedValue(
        'https://s3.ap-northeast-2.amazonaws.com/bucket/hiddenbar/profiles/1/new.jpg',
      );
      s3.deleteObject.mockRejectedValue(new Error('S3 delete failed'));

      const result = await service.uploadProfileImage(1, mockFile);

      expect(result.profileImage).toBe(
        'https://s3.ap-northeast-2.amazonaws.com/bucket/hiddenbar/profiles/1/new.jpg',
      );
    });

    it('should not delete old image if not an S3 URL', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        profileImage: 'https://google.com/avatar.jpg',
      });
      userRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      s3.uploadProfilePhoto.mockResolvedValue(
        'https://s3.ap-northeast-2.amazonaws.com/bucket/hiddenbar/profiles/1/new.jpg',
      );

      await service.uploadProfileImage(1, mockFile);

      expect(s3.deleteObject).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        service.uploadProfileImage(1, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.uploadProfileImage(999, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── changePassword ─────────────────────────────────

  describe('changePassword', () => {
    it('should change password when current password matches', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // currentPassword matches
        .mockResolvedValueOnce(false); // newPassword differs
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-pw');

      await expect(
        service.changePassword(1, {
          currentPassword: 'password1',
          newPassword: 'newpass123',
        }),
      ).resolves.toBeUndefined();

      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when current password does not match', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(1, {
          currentPassword: 'wrong',
          newPassword: 'newpass123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for social login account without passwordHash', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });

      await expect(
        service.changePassword(1, {
          currentPassword: 'any',
          newPassword: 'newpass123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when new password equals current password', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // currentPassword matches
        .mockResolvedValueOnce(true); // newPassword same as current

      await expect(
        service.changePassword(1, {
          currentPassword: 'password1',
          newPassword: 'password1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword(999, {
          currentPassword: 'any',
          newPassword: 'newpass123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should hash new password with bcrypt before saving', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');

      await service.changePassword(1, {
        currentPassword: 'password1',
        newPassword: 'newpass123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', BCRYPT_SALT_ROUNDS);
    });
  });
});
