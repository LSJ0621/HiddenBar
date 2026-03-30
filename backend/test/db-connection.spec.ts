import { DataSource } from 'typeorm';

const dbUrl = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;
const describeIfDb = dbUrl ? describe : describe.skip;

describeIfDb('Database Connection', () => {
  it('should connect successfully with valid DATABASE_URL', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      url: dbUrl,
      synchronize: false,
    });

    await expect(dataSource.initialize()).resolves.toBeDefined();
    expect(dataSource.isInitialized).toBe(true);

    await dataSource.destroy();
  });
});

describe('Database Connection - Invalid URL', () => {
  it('should fail to connect with invalid DATABASE_URL', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      url: 'postgresql://invalid:invalid@localhost:59999/nonexistent',
      synchronize: false,
      connectTimeoutMS: 2000,
    });

    await expect(dataSource.initialize()).rejects.toThrow();
  }, 10000);
});
