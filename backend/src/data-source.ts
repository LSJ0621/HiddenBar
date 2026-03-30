import { config } from 'dotenv';
config({ path: ['.env.local', '.env'] });
import { DataSource } from 'typeorm';

/**
 * TypeORM CLI 전용 DataSource.
 * NestJS 외부(마이그레이션 CLI)에서 실행되므로 dotenv/config로 .env를 직접 로드한다.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
