import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * pg_trgm GIN 인덱스 추가. 바 이름/주소에 대한 퍼지 매칭 성능을 확보한다.
 */
export class AddTrgmGinIndexes1710000000000 implements MigrationInterface {
  name = 'AddTrgmGinIndexes1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_bar_name_trgm ON bars USING GIN (name gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_bar_address_trgm ON bars USING GIN (address gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bar_address_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bar_name_trgm`);
  }
}
