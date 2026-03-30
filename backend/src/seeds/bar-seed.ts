import { config } from 'dotenv';
config({ path: ['.env.local', '.env'] });
import dataSource from '../data-source';
import { Bar } from '../entities/bar.entity';
import { BarPhoto } from '../entities/bar-photo.entity';
import { MenuItem } from '../entities/menu-item.entity';
import { OperatingHours } from '../entities/operating-hours.entity';
import { User } from '../entities/user.entity';
import { barSeedData } from './bar-seed.data';

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('시드 스크립트는 프로덕션 환경에서 실행할 수 없습니다.');
    process.exit(1);
  }

  await dataSource.initialize();
  console.log('DataSource initialized');

  const userRepo = dataSource.getRepository(User);
  const barRepo = dataSource.getRepository(Bar);
  const photoRepo = dataSource.getRepository(BarPhoto);
  const menuItemRepo = dataSource.getRepository(MenuItem);
  const operatingHoursRepo = dataSource.getRepository(OperatingHours);

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('ADMIN_EMAIL is not set');
    await dataSource.destroy();
    process.exit(1);
  }

  const admin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!admin) {
    console.error(`Admin user not found: ${adminEmail}`);
    console.error('Start the server first to create the admin account.');
    await dataSource.destroy();
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;

  for (const data of barSeedData) {
    const existing = await barRepo.findOne({ where: { name: data.name } });
    if (existing) {
      console.log(`[skip] ${data.name} — already exists`);
      skipped++;
      continue;
    }

    const bar = barRepo.create({
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
    const savedBar = await barRepo.save(bar);

    for (let i = 0; i < data.photos.length; i++) {
      const photo = photoRepo.create({
        barId: savedBar.id,
        url: data.photos[i],
        order: i,
      });
      await photoRepo.save(photo);
    }

    for (const oh of data.operatingHours) {
      await operatingHoursRepo.save(
        operatingHoursRepo.create({
          barId: savedBar.id,
          dayOfWeek: oh.dayOfWeek as OperatingHours['dayOfWeek'],
          openTime: oh.openTime,
          closeTime: oh.closeTime,
          isClosed: oh.isClosed,
        }),
      );
    }

    for (const mi of data.menuItems) {
      await menuItemRepo.save(
        menuItemRepo.create({
          barId: savedBar.id,
          name: mi.name,
          description: mi.description,
          price: mi.price,
          currency: mi.currency,
        }),
      );
    }

    console.log(
      `[insert] ${data.name} (id=${savedBar.id}) + ${data.photos.length} photos + ${data.operatingHours.length} hours + ${data.menuItems.length} menu items`,
    );
    inserted++;
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
