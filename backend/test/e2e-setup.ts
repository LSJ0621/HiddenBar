import { DataSource } from 'typeorm';
import { testDataSource } from './test-data-source';

/**
 * 테스트 DataSource를 초기화한다.
 * 이미 초기화되어 있으면 스킵한다 (멱등성 보장).
 */
export async function initTestDb(): Promise<DataSource> {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }
  return testDataSource;
}

/**
 * 모든 테이블의 데이터를 TRUNCATE한다. FK 제약 조건을 CASCADE로 처리한다.
 * 단일 쿼리로 실행하여 concurrent query 경고를 방지한다.
 */
export async function truncateAllTables(dataSource: DataSource): Promise<void> {
  const tableNames = dataSource.entityMetadatas
    .map((entity) => `"${entity.tableName}"`)
    .join(', ');
  await dataSource.query(
    `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`,
  );
}
