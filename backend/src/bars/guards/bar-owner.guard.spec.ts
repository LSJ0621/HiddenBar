import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BarOwnerGuard } from './bar-owner.guard.js';
import { Bar } from '../../entities/bar.entity.js';

const mockBarRepository = () => ({
  findOne: jest.fn(),
});

describe('BarOwnerGuard', () => {
  let guard: BarOwnerGuard;
  let barRepo: ReturnType<typeof mockBarRepository>;

  const createMockContext = (params: any, user: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ params, user }),
      }),
    }) as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarOwnerGuard,
        { provide: getRepositoryToken(Bar), useFactory: mockBarRepository },
      ],
    }).compile();

    guard = module.get<BarOwnerGuard>(BarOwnerGuard);
    barRepo = module.get(getRepositoryToken(Bar));
  });

  it('should allow bar owner to proceed', async () => {
    barRepo.findOne.mockResolvedValue({ id: 1, ownerId: 1 });

    const result = await guard.canActivate(
      createMockContext({ id: '1' }, { id: 1 }),
    );

    expect(result).toBe(true);
  });

  it('should reject non-owner with ForbiddenException', async () => {
    barRepo.findOne.mockResolvedValue({ id: 1, ownerId: 99 });

    await expect(
      guard.canActivate(createMockContext({ id: '1' }, { id: 1 })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException for non-existent bar', async () => {
    barRepo.findOne.mockResolvedValue(null);

    await expect(
      guard.canActivate(createMockContext({ id: '999' }, { id: 1 })),
    ).rejects.toThrow(NotFoundException);
  });
});
