import { BadRequestException } from '@nestjs/common';
import { ImageValidationPipe } from './file-validation.pipe.js';

describe('ImageValidationPipe', () => {
  let pipe: ImageValidationPipe;

  beforeEach(() => {
    pipe = new ImageValidationPipe();
  });

  it('should pass valid JPEG file', () => {
    const file = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xe0,
        ...new Array<number>(100).fill(0),
      ]),
    } as Express.Multer.File;

    expect(pipe.transform([file])).toEqual([file]);
  });

  it('should throw BadRequestException for invalid file format', () => {
    const file = {
      originalname: 'test.gif',
      mimetype: 'image/gif',
      size: 1024,
      buffer: Buffer.from([0x47, 0x49, 0x46, 0x38]),
    } as Express.Multer.File;

    expect(() => pipe.transform([file])).toThrow(BadRequestException);
  });

  it('should throw BadRequestException for file exceeding 5MB', () => {
    const file = {
      originalname: 'large.jpg',
      mimetype: 'image/jpeg',
      size: 6 * 1024 * 1024,
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
    } as Express.Multer.File;

    expect(() => pipe.transform([file])).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when magic bytes do not match any known image format', () => {
    // File claims to be JPEG but has completely invalid magic bytes
    const file = {
      originalname: 'fake.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from([0x00, 0x00, 0x00, 0x00]),
    } as Express.Multer.File;

    expect(() => pipe.transform([file])).toThrow(BadRequestException);
  });

  it('should return files as-is when array is empty', () => {
    expect(pipe.transform([])).toEqual([]);
  });
});
