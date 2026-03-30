import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role, AuthProvider } from '@my-project/shared';
import { BCRYPT_SALT_ROUNDS } from '../config/configuration.js';
import { User } from '../../entities/user.entity.js';
import { Account } from '../../entities/account.entity.js';

/**
 * 서버 시작 시 관리자 계정을 자동 생성하는 서비스.
 * ADMIN_EMAIL 환경변수가 설정되어 있고 해당 유저가 없으면 생성한다.
 */
@Injectable()
export class AdminInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminInitService.name);
  private _ready: Promise<void> | null = null;

  /** 초기화 완료까지 대기할 수 있는 Promise */
  get ready(): Promise<void> {
    return this._ready ?? Promise.resolve();
  }

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    this._ready = this.init();
    await this._ready;
  }

  private async init() {
    const email = this.configService.get<string>('admin.email');
    if (!email) {
      this.logger.warn('ADMIN_EMAIL not set — skipping admin creation');
      return;
    }

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      this.logger.log(`Admin already exists: ${email}`);
      return;
    }

    const password = this.configService.get<string>('admin.password');
    const name = this.configService.get<string>('admin.name');
    if (!password || !name) {
      this.logger.warn(
        'ADMIN_PASSWORD or ADMIN_NAME not set — skipping admin creation',
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = this.userRepository.create({
      email,
      passwordHash,
      name,
      role: Role.ADMIN,
      isActive: true,
    });
    const savedUser = await this.userRepository.save(user);

    const account = this.accountRepository.create({
      userId: savedUser.id,
      provider: AuthProvider.EMAIL,
      providerAccountId: email,
    });
    await this.accountRepository.save(account);

    this.logger.log(`Admin created: ${email} (id=${savedUser.id})`);
  }
}
