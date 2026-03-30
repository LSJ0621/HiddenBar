import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchVector1709500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. tsvector 컬럼 추가 (synchronize가 이미 생성했을 수 있으므로 IF NOT EXISTS 패턴)
    const hasColumn = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'bars' AND column_name = 'searchVector' LIMIT 1;
    `);
    if (hasColumn.length === 0) {
      await queryRunner.query(
        `ALTER TABLE bars ADD COLUMN "searchVector" tsvector;`,
      );
    }

    // 2. GIN 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS bars_search_vector_idx ON bars USING GIN ("searchVector");
    `);

    // 3. 트리거 함수 생성
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION bars_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW."searchVector" :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.address, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 4. 트리거 등록
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS bars_search_vector_trigger ON bars;
      CREATE TRIGGER bars_search_vector_trigger
        BEFORE INSERT OR UPDATE OF name, description, address, city
        ON bars
        FOR EACH ROW
        EXECUTE FUNCTION bars_search_vector_update();
    `);

    // 5. 기존 데이터 벡터 초기화
    await queryRunner.query(`
      UPDATE bars SET "searchVector" =
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(address, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(city, '')), 'C');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS bars_search_vector_trigger ON bars;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS bars_search_vector_update;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS bars_search_vector_idx;`);
    await queryRunner.query(
      `ALTER TABLE bars DROP COLUMN IF EXISTS "searchVector";`,
    );
  }
}
