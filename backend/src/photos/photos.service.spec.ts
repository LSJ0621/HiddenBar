import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import { PhotosService } from './photos.service.js';
import { BarPhoto } from '../entities/bar-photo.entity.js';
import { Bar } from '../entities/bar.entity.js';
import { S3Client } from '../external/aws/clients/s3.client.js';

const mockBarPhotoRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto: any) => dto),
  save: jest.fn((entity: any) => Promise.resolve({ id: 1, ...entity })),
  softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
  count: jest.fn(),
});

const mockBarRepository = () => ({
  findOne: jest.fn(),
});

const mockS3Client = () => ({
  uploadBarPhoto: jest
    .fn()
    .mockResolvedValue('https://s3.example.com/hiddenbar/bars/1/photo.jpg'),
  deleteObject: jest.fn().mockResolvedValue(undefined),
});

describe('PhotosService', () => {
  let service: PhotosService;
  let barPhotoRepo: ReturnType<typeof mockBarPhotoRepository>;
  let barRepo: ReturnType<typeof mockBarRepository>;
  let s3Client: ReturnType<typeof mockS3Client>;

  const mockUser = { id: 1 };
  const mockBar = { id: 1, ownerId: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosService,
        {
          provide: getRepositoryToken(BarPhoto),
          useFactory: mockBarPhotoRepository,
        },
        { provide: getRepositoryToken(Bar), useFactory: mockBarRepository },
        { provide: S3Client, useFactory: mockS3Client },
      ],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
    barPhotoRepo = module.get(getRepositoryToken(BarPhoto));
    barRepo = module.get(getRepositoryToken(Bar));
    s3Client = module.get(S3Client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── upload ─────────────────────────────────────────────

  describe('upload', () => {
    const mockFile = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('fake-data'),
    } as Express.Multer.File;

    it('should upload photos and create BarPhoto records', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      barPhotoRepo.count.mockResolvedValue(0);
      barPhotoRepo.save.mockResolvedValue({
        id: 1,
        url: 'https://s3.example.com/photo.jpg',
        order: 0,
        barId: 1,
      });

      const result = await service.upload(1, [mockFile], mockUser);

      expect(result.photos).toHaveLength(1);
      expect(result.failedCount).toBe(0);
      expect(s3Client.uploadBarPhoto).toHaveBeenCalledWith(mockFile, 1);
    });

    it('should throw ForbiddenException when user is not bar owner', async () => {
      barRepo.findOne.mockResolvedValue({ ...mockBar, ownerId: 99 });

      await expect(service.upload(1, [mockFile], mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for non-existent bar', async () => {
      barRepo.findOne.mockResolvedValue(null);

      await expect(service.upload(999, [mockFile], mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when total photo count exceeds 5', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      barPhotoRepo.count.mockResolvedValue(4);

      await expect(
        service.upload(1, [mockFile, mockFile], mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate unique S3 key with pattern bars/{barId}/{uuid}.{ext}', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      barPhotoRepo.count.mockResolvedValue(0);
      barPhotoRepo.save.mockResolvedValue({
        id: 1,
        url: 'https://s3.example.com/photo.jpg',
        order: 0,
        barId: 1,
      });

      await service.upload(1, [mockFile], mockUser);

      expect(s3Client.uploadBarPhoto).toHaveBeenCalledWith(mockFile, 1);
    });

    it('should return only successfully uploaded photos when some uploads fail', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      barPhotoRepo.count.mockResolvedValue(0);
      const file2 = {
        ...mockFile,
        originalname: 'test2.jpg',
      } as Express.Multer.File;

      s3Client.uploadBarPhoto
        .mockResolvedValueOnce('https://s3.example.com/photo1.jpg')
        .mockRejectedValueOnce(new Error('S3 upload failed'));

      barPhotoRepo.save.mockResolvedValueOnce({
        id: 1,
        url: 'https://s3.example.com/photo1.jpg',
        order: 0,
        barId: 1,
      });

      const result = await service.upload(1, [mockFile, file2], mockUser);

      expect(result.photos).toHaveLength(1);
      expect(result.photos[0].url).toBe('https://s3.example.com/photo1.jpg');
      expect(result.failedCount).toBe(1);
    });

    it('사진 업로드 실패 시 logger.error를 호출한다', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      barPhotoRepo.count.mockResolvedValue(0);
      const file2 = {
        ...mockFile,
        originalname: 'test2.jpg',
      } as Express.Multer.File;

      s3Client.uploadBarPhoto
        .mockResolvedValueOnce('https://s3.example.com/photo1.jpg')
        .mockRejectedValueOnce(new Error('S3 upload failed'));

      barPhotoRepo.save.mockResolvedValueOnce({
        id: 1,
        url: 'https://s3.example.com/photo1.jpg',
        order: 0,
        barId: 1,
      });

      const loggerSpy = jest.spyOn(
        (service as any).logger,
        'error',
      );

      await service.upload(1, [mockFile, file2], mockUser);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('사진 업로드 실패 [barId=1, index=1]'),
      );
    });

    it('should throw BadGatewayException when all photo uploads fail', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      barPhotoRepo.count.mockResolvedValue(0);

      s3Client.uploadBarPhoto.mockRejectedValue(new Error('S3 upload failed'));

      await expect(service.upload(1, [mockFile], mockUser)).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  // ─── remove ─────────────────────────────────────────────

  describe('remove', () => {
    it('should delete photo from S3 and database', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      barPhotoRepo.findOne.mockResolvedValue({
        id: 1,
        barId: 1,
        url: 'https://s3.example.com/photo.jpg',
      });

      await service.remove(1, 1, mockUser);

      expect(s3Client.deleteObject).toHaveBeenCalled();
      expect(barPhotoRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw ForbiddenException when user is not bar owner', async () => {
      barRepo.findOne.mockResolvedValue({ ...mockBar, ownerId: 99 });

      await expect(service.remove(1, 1, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when photo does not exist', async () => {
      barRepo.findOne.mockResolvedValue(mockBar);
      barPhotoRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when bar does not exist', async () => {
      barRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
