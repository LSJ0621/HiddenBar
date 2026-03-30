import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * 서버 시작 시 bars 테이블의 DB 트리거를 보장하는 서비스.
 * synchronize/dropSchema로 DB가 재생성되어도 트리거가 항상 존재하도록 한다.
 */
@Injectable()
export class TriggerInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TriggerInitService.name);
  private _ready: Promise<void> | null = null;

  /** 트리거 초기화 완료까지 대기할 수 있는 Promise */
  get ready(): Promise<void> {
    return this._ready ?? Promise.resolve();
  }

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    this._ready = this.init();
    await this._ready;
  }

  private async init() {
    const lockId = 'trigger_init';
    const acquired = await this.dataSource.query(
      `SELECT pg_try_advisory_lock(hashtext($1))`,
      [lockId],
    );
    if (!acquired[0].pg_try_advisory_lock) {
      this.logger.log(
        'Another instance is initializing triggers, skipping...',
      );
      return;
    }
    try {
      await this.ensureSearchVectorTrigger();
      await this.ensureLocationTrigger();
      await this.ensurePgTrgmExtensionAndIndex();
    } finally {
      await this.dataSource.query(
        `SELECT pg_advisory_unlock(hashtext($1))`,
        [lockId],
      );
    }
  }

  private async ensureSearchVectorTrigger() {
    const exists = await this.dataSource.query(`
      SELECT 1 FROM pg_trigger WHERE tgname = 'bars_search_vector_trigger' LIMIT 1;
    `);
    if (exists.length > 0) return;

    this.logger.log('Creating bars search vector trigger...');

    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS bars_search_vector_idx ON bars USING GIN ("searchVector");
    `);

    await this.dataSource.query(`
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

    await this.dataSource.query(`
      CREATE TRIGGER bars_search_vector_trigger
        BEFORE INSERT OR UPDATE OF name, description, address, city
        ON bars FOR EACH ROW
        EXECUTE FUNCTION bars_search_vector_update();
    `);

    await this.dataSource.query(`
      UPDATE bars SET "searchVector" =
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(address, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(city, '')), 'C');
    `);

    this.logger.log('Search vector trigger created and data backfilled');
  }

  private async ensureLocationTrigger() {
    const exists = await this.dataSource.query(`
      SELECT 1 FROM pg_trigger WHERE tgname = 'bars_location_trigger' LIMIT 1;
    `);
    if (exists.length > 0) return;

    this.logger.log('Creating bars location trigger...');

    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_bar_location ON bars USING GIST (location);
    `);

    await this.dataSource.query(`
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

    await this.dataSource.query(`
      CREATE TRIGGER bars_location_trigger
        BEFORE INSERT OR UPDATE OF latitude, longitude
        ON bars FOR EACH ROW
        EXECUTE FUNCTION bars_location_update();
    `);

    await this.dataSource.query(`
      UPDATE bars SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    `);

    this.logger.log('Location trigger created and data backfilled');
  }

  private async ensurePgTrgmExtensionAndIndex() {
    await this.dataSource.query(
      `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
    );

    const indexExists = await this.dataSource.query(`
      SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bar_name_trgm' LIMIT 1;
    `);
    if (indexExists.length > 0) return;

    this.logger.log('Creating bars name trigram index...');

    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS idx_bar_name_trgm ON bars USING GIN (name gin_trgm_ops);`,
    );

    this.logger.log('Trigram index created');
  }
}
