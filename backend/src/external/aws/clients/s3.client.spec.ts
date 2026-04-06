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

  describe('파일명 검증 (extractSafeFileExtension 간접 테스트)', () => {
    it('../ 포함 파일명 → BadRequestException', async () => {
      const maliciousFile = { ...mockFile, originalname: '../etc/passwd.jpg' };

      await expect(
        s3Client.uploadProfilePhoto(maliciousFile, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('..\\ 포함 파일명 → BadRequestException', async () => {
      const maliciousFile = {
        ...mockFile,
        originalname: '..\\etc\\passwd.jpg',
      };

      await expect(
        s3Client.uploadProfilePhoto(maliciousFile, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('Null byte 포함 파일명 → BadRequestException', async () => {
      const maliciousFile = {
        ...mockFile,
        originalname: 'photo\0.jpg',
      };

      await expect(
        s3Client.uploadProfilePhoto(maliciousFile, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('확장자 없는 파일명 → 기본 jpg 확장자 사용', async () => {
      const noExtFile = { ...mockFile, originalname: 'photo' };

      const url = await s3Client.uploadProfilePhoto(noExtFile, 1);

      expect(url).toMatch(/\.jpg$/);
    });

    it('허용되지 않은 확장자(.gif) → 기본 jpg 확장자 사용', async () => {
      const gifFile = { ...mockFile, originalname: 'animation.gif' };

      const url = await s3Client.uploadProfilePhoto(gifFile, 1);

      expect(url).toMatch(/\.jpg$/);
    });

    it('.png 파일 → png 확장자 유지', async () => {
      const pngFile = { ...mockFile, originalname: 'image.png' };

      const url = await s3Client.uploadProfilePhoto(pngFile, 1);

      expect(url).toMatch(/\.png$/);
    });

    it('.webp 파일 → webp 확장자 유지', async () => {
      const webpFile = { ...mockFile, originalname: 'image.webp' };

      const url = await s3Client.uploadProfilePhoto(webpFile, 1);

      expect(url).toMatch(/\.webp$/);
    });
  });

  describe('uploadBarPhoto', () => {
    it('올바른 S3 키 포맷으로 업로드한다 (hiddenbar/bars/{barId}/)', async () => {
      const url = await s3Client.uploadBarPhoto(mockFile, 99);

      expect(url).toContain('hiddenbar/bars/99/');
      expect(url).toMatch(/\.jpg$/);
    });

    it('S3 URL을 반환한다', async () => {
      const url = await s3Client.uploadBarPhoto(mockFile, 1);

      expect(url).toContain(
        'https://s3.ap-northeast-2.amazonaws.com/test-bucket/',
      );
    });

    it('S3 비활성 시 BadRequestException', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Client,
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => undefined) },
          },
        ],
      }).compile();

      const disabledClient = module.get<S3Client>(S3Client);

      await expect(
        disabledClient.uploadBarPhoto(mockFile, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadReviewPhoto', () => {
    it('올바른 S3 키 포맷으로 업로드한다 (hiddenbar/reviews/{reviewId}/)', async () => {
      const result = await s3Client.uploadReviewPhoto(mockFile, 55);

      expect(result.url).toContain('hiddenbar/reviews/55/');
      expect(result.url).toMatch(/\.jpg$/);
      expect(result.s3Key).toContain('hiddenbar/reviews/55/');
    });

    it('url과 s3Key를 모두 반환한다', async () => {
      const result = await s3Client.uploadReviewPhoto(mockFile, 1);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('s3Key');
      expect(result.url).toContain(
        'https://s3.ap-northeast-2.amazonaws.com/test-bucket/',
      );
      expect(result.url).toContain(result.s3Key);
    });

    it('S3 비활성 시 BadRequestException', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Client,
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => undefined) },
          },
        ],
      }).compile();

      const disabledClient = module.get<S3Client>(S3Client);

      await expect(
        disabledClient.uploadReviewPhoto(mockFile, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteObject', () => {
    it('URL에서 S3 Key를 추출하여 DeleteObjectCommand를 호출한다', async () => {
      const { DeleteObjectCommand, __mockSend: mockSend } =
        jest.requireMock('@aws-sdk/client-s3');

      mockSend.mockClear();
      DeleteObjectCommand.mockClear();

      const testUrl =
        'https://s3.ap-northeast-2.amazonaws.com/test-bucket/hiddenbar/bars/1/abc.jpg';

      await s3Client.deleteObject(testUrl);

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'hiddenbar/bars/1/abc.jpg',
      });
      expect(mockSend).toHaveBeenCalled();
    });

    it('S3 비활성 시 예외 없이 조기 반환한다', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Client,
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => undefined) },
          },
        ],
      }).compile();

      const disabledClient = module.get<S3Client>(S3Client);

      await expect(
        disabledClient.deleteObject(
          'https://s3.ap-northeast-2.amazonaws.com/test-bucket/some-key.jpg',
        ),
      ).resolves.toBeUndefined();
    });
  });
});
