import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 짧은 prefix 자동완성(<4자) 용 B-tree 인덱스.
 *
 * pg_trgm GIN(`name gin_trgm_ops`) 은 2~3자 입력에서 trigram 카디널리티가 폭증해
 * Bitmap Heap Scan 리체크가 수만 행을 걷어내느라 고부하 시 병목이 된다
 * (Phase 2 측정: 쿼리당 21,699 rows recheck, mean 1.39s).
 *
 * 대신 `lower(name) LIKE 'ho%'` 경로는 `varchar_pattern_ops` B-tree 로 범위 스캔이
 * 가능하므로, 짧은 prefix 에 한해 이 인덱스를 쓰고 4자 이상은 기존 trgm `%` 경로를 유지한다.
 * 트레이드오프: 짧은 입력에서 오타 허용(fuzzy) 은 포기한다(Phase 3 합의).
 */
export class AddBarNameLowerPrefixIndex1712000000000 implements MigrationInterface {
  name = 'AddBarNameLowerPrefixIndex1712000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_bar_name_lower_prefix
         ON bars (lower(name) varchar_pattern_ops)
         WHERE "deletedAt" IS NULL AND status = 'APPROVED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bar_name_lower_prefix`);
  }
}
