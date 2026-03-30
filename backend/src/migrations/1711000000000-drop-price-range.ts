import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * bars 테이블에서 priceRange 컬럼과 관련 enum 타입을 제거한다.
 */
export class DropPriceRange1711000000000 implements MigrationInterface {
  name = 'DropPriceRange1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bars" DROP COLUMN IF EXISTS "priceRange"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "bars_pricerange_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "bars_pricerange_enum" AS ENUM('BUDGET', 'MODERATE', 'PREMIUM', 'LUXURY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "bars" ADD COLUMN "priceRange" "bars_pricerange_enum"`,
    );
  }
}
