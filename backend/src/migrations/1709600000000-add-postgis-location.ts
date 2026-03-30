import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostgisLocation1709600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. PostGIS 확장 활성화
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    // 2. geography(Point, 4326) 컬럼 추가 (synchronize가 이미 생성했을 수 있음)
    const hasColumn = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'bars' AND column_name = 'location' LIMIT 1;
    `);
    if (hasColumn.length === 0) {
      await queryRunner.query(
        `ALTER TABLE bars ADD COLUMN location geography(Point, 4326);`,
      );
    }

    // 3. GIST 공간 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bar_location ON bars USING GIST (location);
    `);

    // 4. lat/lng → location 동기화 트리거 함수
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION bars_location_update() RETURNS trigger AS $$
      BEGIN
        IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
          NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
        ELSE
          NEW.location := NULL;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 5. 트리거 등록
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS bars_location_trigger ON bars;
      CREATE TRIGGER bars_location_trigger
        BEFORE INSERT OR UPDATE OF latitude, longitude
        ON bars FOR EACH ROW
        EXECUTE FUNCTION bars_location_update();
    `);

    // 6. 기존 데이터 백필
    await queryRunner.query(`
      UPDATE bars SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS bars_location_trigger ON bars;`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS bars_location_update;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bar_location;`);
    await queryRunner.query(`ALTER TABLE bars DROP COLUMN IF EXISTS location;`);
    // PostGIS extension은 삭제하지 않음 (다른 곳에서 사용할 수 있으므로)
  }
}
