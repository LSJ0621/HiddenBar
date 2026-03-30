import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role, AuthProvider } from '@my-project/shared';
import { BCRYPT_SALT_ROUNDS } from '../config/configuration.js';
import { User } from '../../entities/user.entity.js';
import { Account } from '../../entities/account.entity.js';

/**
 * 테스트 환경(NODE_ENV=test)에서만 테스트용 일반 유저를 자동 생성하는 서비스.
 * - user1: auth.setup.ts에서 공유 세션(storageState) 용도
 * - user2: auth.spec.ts에서 로그인/로그아웃 실제 API 테스트 전용 (user1 세션 보호)
 */
@Injectable()
export class TestUserInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestUserInitService.name);

  private readonly TEST_USERS = [
    {
      email: 'user1@test.com',
      password: 'Test1234!',
      name: '테스트유저1',
    },
    {
      email: 'user2@test.com',
      password: 'Test1234!',
      name: '테스트유저2',
    },
  ];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV !== 'test') {
      return;
    }

    for (const testUser of this.TEST_USERS) {
      await this.ensureUser(testUser);
    }
  }

  /** 테스트 유저가 없으면 생성한다 (idempotent). */
  private async ensureUser(testUser: { email: string; password: string; name: string }) {
    const existing = await this.userRepository.findOne({
      where: { email: testUser.email },
    });
    if (existing) {
      this.logger.log(`Test user already exists: ${testUser.email}`);
      return;
    }

    const passwordHash = await bcrypt.hash(testUser.password, BCRYPT_SALT_ROUNDS);

    const user = this.userRepository.create({
      email: testUser.email,
      passwordHash,
      name: testUser.name,
      role: Role.USER,
      isActive: true,
    });
    const savedUser = await this.userRepository.save(user);

    const account = this.accountRepository.create({
      userId: savedUser.id,
      provider: AuthProvider.EMAIL,
      providerAccountId: testUser.email,
    });
    await this.accountRepository.save(account);

    this.logger.log(`Test user created: ${testUser.email} (id=${savedUser.id})`);
  }
}
