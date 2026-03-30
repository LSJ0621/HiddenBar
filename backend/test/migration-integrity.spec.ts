import { DataSource } from 'typeorm';
import * as path from 'path';

const dbUrl = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;
const describeIfDb = dbUrl ? describe : describe.skip;

describeIfDb('Migration Integrity', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: dbUrl,
      synchronize: false,
      migrations: [path.join(__dirname, '../src/migrations/*.ts')],
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should have no pending migrations', async () => {
    const hasPendingMigrations = await dataSource.showMigrations();
    expect(hasPendingMigrations).toBe(false);
  });

  it('should run migrations without errors', async () => {
    await expect(dataSource.runMigrations()).resolves.toBeDefined();
  });

  it('should revert all migrations without errors', async () => {
    const migrations = await dataSource.runMigrations();
    // Revert all executed migrations, not just the last one
    for (let i = 0; i < migrations.length; i++) {
      await expect(dataSource.undoLastMigration()).resolves.toBeUndefined();
    }
  });

  it('should produce the same schema as synchronize', async () => {
    // 마이그레이션으로 만든 스키마에서 추가 마이그레이션이 필요 없어야 함
    // (= synchronize가 만들 스키마와 동일)
    const entityPath = path.join(__dirname, '../src/entities/*.ts');

    const syncDataSource = new DataSource({
      type: 'postgres',
      url: dbUrl,
      entities: [entityPath],
      synchronize: false,
      migrations: [path.join(__dirname, '../src/migrations/*.ts')],
    });

    await syncDataSource.initialize();

    try {
      // generateMigration이 null을 반환하면 변경사항 없음 = 스키마 동일
      const sqlInMemory = await syncDataSource.driver.createSchemaBuilder().log();
      const upQueries = sqlInMemory.upQueries.filter(
        (q) => !q.query.includes('query_result_cache'),
      );

      expect(upQueries).toEqual([]);
    } finally {
      await syncDataSource.destroy();
    }
  });
});
