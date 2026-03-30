import { DataSource } from 'typeorm';
import * as path from 'path';

/**
 * 테스트 DB용 DataSource. E2E 테스트에서 사용한다.
 * .env.test의 POSTGRES_* 환경변수를 사용하며, 미설정 시 docker-compose postgres-test(5433) 기본값 사용.
 */
export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5433', 10),
  username: process.env.POSTGRES_USER ?? 'hiddenbar',
  password: process.env.POSTGRES_PASSWORD ?? 'hiddenbar',
  database: process.env.POSTGRES_DB ?? 'hiddenbar_test',
  synchronize: true,
  dropSchema: true,
  entities: [path.join(__dirname, '../src/entities/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../src/migrations/*.{ts,js}')],
});
