import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { S3Client } from './s3.client.js';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    __mockSend: mockSend,
  };
});

const mockConfigValues: Record<string, string> = {
  'aws.accessKeyId': 'test-key',
  'aws.secretAccessKey': 'test-secret',
  'aws.s3Bucket': 'test-bucket',
  'aws.s3Region': 'ap-northeast-2',
};

describe('S3Client', () => {
  let s3Client: S3Client;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Client,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigValues[key]),
          },
        },
      ],
    }).compile();

    s3Client = module.get<S3Client>(S3Client);
  });

  const mockFile = {
    originalname: 'photo.jpg',
    buffer: Buffer.from('test-data'),
    mimetype: 'image/jpeg',
  } as Express.Multer.File;

  describe('uploadProfilePhoto', () => {
    it('should upload to S3 with correct key format', async () => {
      const url = await s3Client.uploadProfilePhoto(mockFile, 42);

      expect(url).toContain('hiddenbar/profiles/42/');
      expect(url).toMatch(/\.jpg$/);
    });

    it('should return the S3 URL', async () => {
      const url = await s3Client.uploadProfilePhoto(mockFile, 1);

      expect(url).toContain(
        'https://s3.ap-northeast-2.amazonaws.com/test-bucket/',
      );
    });
  });

  describe('uploadProfilePhoto - disabled', () => {
    it('should throw BadRequestException when S3 is not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Client,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const disabledClient = module.get<S3Client>(S3Client);

      await expect(
        disabledClient.uploadProfilePhoto(mockFile, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
