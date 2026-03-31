import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Bar } from '../../entities/bar.entity.js';
import { BarPhoto } from '../../entities/bar-photo.entity.js';
import { MenuItem } from '../../entities/menu-item.entity.js';
import { OperatingHours } from '../../entities/operating-hours.entity.js';
import { User } from '../../entities/user.entity.js';
import { barSeedData } from '../../seeds/bar-seed.data.js';
import { AdminInitService } from './admin-init.service.js';
import { TriggerInitService } from './trigger-init.service.js';

/**
 * Dev 환경에서 서버 시작 시 바 시드 데이터를 자동 삽입하는 서비스.
 * production 환경에서는 실행되지 않으며, 이미 데이터가 존재하면 스킵한다.
 */
@Injectable()
export class SeedInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedInitService.name);

  constructor(
    @InjectRepository(Bar)
    private readonly barRepository: Repository<Bar>,
    @InjectRepository(BarPhoto)
    private readonly barPhotoRepository: Repository<BarPhoto>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(OperatingHours)
    private readonly operatingHoursRepository: Repository<OperatingHours>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly adminInitService: AdminInitService,
    private readonly triggerInitService: TriggerInitService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'production' && process.env.SEED_ENABLED !== 'true') {
      return;
    }

    await Promise.all([this.adminInitService.ready, this.triggerInitService.ready]);

    const adminEmail = this.configService.get<string>('admin.email');
    if (!adminEmail) {
      this.logger.warn('ADMIN_EMAIL not set — skipping seed');
      return;
    }

    const admin = await this.userRepository.findOne({
      where: { email: adminEmail },
    });
    if (!admin) {
      this.logger.warn(
        `Admin user not found: ${adminEmail} — skipping seed`,
      );
      return;
    }

    let inserted = 0;
    for (const data of barSeedData) {
      const existing = await this.barRepository.findOne({
        where: { name: data.name },
      });
      if (existing) {
        continue;
      }

      const bar = this.barRepository.create({
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        country: 'South Korea',
        latitude: data.latitude,
        longitude: data.longitude,
        status: 'APPROVED' as Bar['status'],
        ownerId: admin.id,
      });
      const savedBar = await this.barRepository.save(bar);

      for (let i = 0; i < data.photos.length; i++) {
        const photo = this.barPhotoRepository.create({
          barId: savedBar.id,
          url: data.photos[i],
          order: i,
        });
        await this.barPhotoRepository.save(photo);
      }

      for (const oh of data.operatingHours) {
        await this.operatingHoursRepository.save(
          this.operatingHoursRepository.create({
            barId: savedBar.id,
            dayOfWeek: oh.dayOfWeek as OperatingHours['dayOfWeek'],
            openTime: oh.openTime,
            closeTime: oh.closeTime,
            isClosed: oh.isClosed,
          }),
        );
      }

      for (const mi of data.menuItems) {
        await this.menuItemRepository.save(
          this.menuItemRepository.create({
            barId: savedBar.id,
            name: mi.name,
            description: mi.description,
            price: mi.price,
            currency: mi.currency,
          }),
        );
      }

      inserted++;
    }

    if (inserted > 0) {
      this.logger.log(`Seeded ${inserted} bars with photos, operating hours, and menu items`);
    } else {
      this.logger.log('All seed bars already exist — skipping');
    }
  }

}
