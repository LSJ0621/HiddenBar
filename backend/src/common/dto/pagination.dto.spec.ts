import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from './pagination.dto.js';

describe('PaginationDto', () => {
  function createDto(partial: Record<string, unknown>): PaginationDto {
    return plainToInstance(PaginationDto, partial);
  }

  it('should use default values when no input is provided', async () => {
    const dto = createDto({});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('should accept valid page and limit', async () => {
    const dto = createDto({ page: 2, limit: 30 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should reject page less than 1', async () => {
    const dto = createDto({ page: 0 });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('should reject limit less than 1', async () => {
    const dto = createDto({ limit: 0 });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should reject limit greater than 50', async () => {
    const dto = createDto({ limit: 51 });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should accept limit of exactly 50', async () => {
    const dto = createDto({ limit: 50 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should reject non-integer page', async () => {
    const dto = createDto({ page: 1.5 });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('should reject non-integer limit', async () => {
    const dto = createDto({ limit: 10.5 });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });
});
