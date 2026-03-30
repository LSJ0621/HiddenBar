# 데이터베이스 초기 설정 및 마이그레이션

> 관련 문서: [README](./README.md) · [ERD](./erd.md) · [시스템 개요](../system-overview.md)

---

## 1. 데이터베이스 초기 설정

> 로컬 개발 환경에서 PostgreSQL을 준비하고, 스키마를 생성하고, 초기 데이터를 투입하는 절차이다.

### 1.1 PostgreSQL 컨테이너 실행

Docker Compose를 사용하여 PostgreSQL 컨테이너를 실행한다.

```bash
# 프로젝트 루트에서
docker compose up -d
```

- `docker-compose.yml`에 정의된 PostgreSQL 서비스가 시작된다.
- 기본 설정: PostGIS/PostgreSQL 16 (`postgis/postgis:16-3.4`), 포트 5432, DB명 `hiddenbar`
- `docker-compose.yml`이 아직 없는 경우, `docs/architecture/system-overview.md` 섹션 0.1 참조

### 1.2 데이터베이스 생성

Docker Compose에서 `POSTGRES_DB=hiddenbar` 환경변수를 설정하면 컨테이너 시작 시 자동으로 `hiddenbar` 데이터베이스가 생성된다. 수동으로 생성해야 하는 경우:

```bash
docker exec -it <container_name> psql -U <user> -c "CREATE DATABASE hiddenbar;"
```

### 1.3 데이터베이스 연결 설정

백엔드 `.env` 파일에 다음 환경변수를 설정한다 (`backend/.env.example` 참조):

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=hiddenbar
POSTGRES_PASSWORD=hiddenbar
POSTGRES_DB=hiddenbar
POSTGRES_SYNCHRONIZE=true
POSTGRES_DROP_SCHEMA=true
```

- `POSTGRES_USER` / `POSTGRES_PASSWORD`는 Docker Compose의 설정과 일치시킨다.
- 개발 환경에서는 `POSTGRES_SYNCHRONIZE=true`, `POSTGRES_DROP_SCHEMA=true`를 사용한다.
- 프로덕션 환경에서는 `POSTGRES_SYNCHRONIZE=false`, `POSTGRES_DROP_SCHEMA=false`로 두고 마이그레이션만 사용한다.

### 1.4 스키마 생성 (마이그레이션)

TypeORM 마이그레이션을 실행하여 테이블과 인덱스를 생성한다.

```bash
cd backend && pnpm typeorm migration:run -d src/data-source.ts
```

- `data-source.ts` 파일이 필요하다. 상세 내용은 `docs/architecture/system-overview.md` 섹션 1.1 참조.
- 마이그레이션 파일 목록은 [섹션 2. 마이그레이션 관리](#2-마이그레이션-관리) 참조.

---

## 2. 마이그레이션 관리

### 2.0 마이그레이션 개요

TypeORM 마이그레이션을 통해 데이터베이스 스키마를 버전 관리한다.

#### `data-source.ts`

마이그레이션 CLI 실행을 위한 DataSource 설정 파일이다. 상세 내용은 `docs/architecture/system-overview.md` 섹션 1.1 참조.

- **파일 위치**: `backend/src/data-source.ts` (생성 완료)

#### 마이그레이션 파일 인벤토리

| 순서 | 파일명 | 설명 | 상태 |
|------|--------|------|------|
| 1 | `1709500000000-add-search-vector.ts` | tsvector 컬럼, GIN 인덱스, 트리거 생성 | 생성 완료 |
| 2 | `1709600000000-add-postgis-location.ts` | PostGIS location 컬럼, GIST 인덱스, lat/lng 동기화 트리거 | 생성 완료 |
| 3 | `1710000000000-add-trgm-gin-indexes.ts` | pg_trgm 확장, bars.name/address GIN trigram 인덱스 추가 | 생성 완료 |
| 4 | `1711000000000-drop-price-range.ts` | bars 테이블 priceRange 컬럼 및 관련 enum 삭제 | 생성 완료 |

> 마이그레이션은 타임스탬프 순서대로 실행된다. 새 마이그레이션 추가 시 이 인벤토리를 업데이트한다.

#### 실행 순서

1. `data-source.ts` 파일 생성 (인프라 작업)
2. 초기 스키마 마이그레이션 생성 (`migration:generate`)
3. 검색 벡터 마이그레이션 생성 (`migration:create` + Raw SQL)
4. `pnpm typeorm migration:run -d src/data-source.ts`

### 2.1 Raw SQL 마이그레이션: 검색 벡터

`bars.searchVector`는 DB에 남아 있는 검색 보조 컬럼이다. 현재 공개 API 검색 계약은 이름/위치 기반 pg_trgm + 위치 검색을 우선 사용하며, 아래 내용은 DB 구조와 마이그레이션 기록 기준으로 유지한다. TypeORM은 `tsvector` 타입을 직접 지원하지 않으므로 Raw SQL 마이그레이션으로 처리한다.

#### 2.1.1 searchVector 컬럼 추가

`bars` 테이블에 전문 검색용 `tsvector` 컬럼을 추가한다. TypeORM `synchronize`가 이미 컬럼을 생성한 경우를 고려하여 중복 생성 방지 로직을 적용한다.

```sql
-- 컬럼 존재 여부 확인 후 조건부 추가
ALTER TABLE bars ADD COLUMN "searchVector" tsvector;
```

> **주의**: 컬럼명은 TypeORM 엔티티와 일치하도록 camelCase(`"searchVector"`)로 지정한다.

#### 2.1.2 GIN 인덱스 생성

`"searchVector"` 컬럼에 GIN(Generalized Inverted Index) 인덱스를 생성하여 전문 검색 성능을 확보한다.

```sql
CREATE INDEX IF NOT EXISTS bars_search_vector_idx ON bars USING GIN ("searchVector");
```

#### 2.1.3 자동 갱신 트리거

`name`, `description`, `address`, `city` 컬럼이 INSERT/UPDATE될 때 `"searchVector"`를 자동으로 갱신하는 트리거 함수를 생성한다. 가중치(weight)를 적용하여 검색 관련도를 조절한다.

- **A (최고 가중치)**: `name` -- 가게 이름
- **B (중간 가중치)**: `description` -- 가게 설명
- **C (낮은 가중치)**: `address`, `city` -- 주소, 도시

```sql
-- 트리거 함수 생성
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

-- 트리거 등록 (기존 트리거가 있으면 교체)
DROP TRIGGER IF EXISTS bars_search_vector_trigger ON bars;
CREATE TRIGGER bars_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, description, address, city
  ON bars
  FOR EACH ROW
  EXECUTE FUNCTION bars_search_vector_update();
```

#### 2.1.4 기존 데이터 벡터 초기화

마이그레이션 시점에 이미 존재하는 `bars` 데이터의 `"searchVector"`를 일괄 갱신한다.

```sql
UPDATE bars SET "searchVector" =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(address, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(city, '')), 'C');
```

#### 2.1.5 TypeORM 마이그레이션 파일

실제 마이그레이션 파일 (`1709500000000-add-search-vector.ts`)의 구현 내용이다. `synchronize`로 인한 컬럼 중복 생성을 방지하는 조건부 로직을 포함한다.

```typescript
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
```

### 2.2 Raw SQL 마이그레이션: PostGIS location

SPEC-04 근처 바 검색 성능 향상을 위한 PostGIS `geography(Point, 4326)` 컬럼 추가이다. 기존 `latitude`/`longitude` float 컬럼은 유지하며, DB 트리거로 양방향 자동 동기화한다.

#### 2.2.1 PostGIS 확장 활성화

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

> Docker 이미지를 `postgis/postgis:16-3.4`로 변경해야 한다. 기존 `postgres:16-alpine`에서는 PostGIS가 포함되어 있지 않다.

#### 2.2.2 location 컬럼 추가

`synchronize`가 이미 컬럼을 생성한 경우를 고려하여 중복 생성 방지 로직을 적용한다.

```sql
-- 컬럼 존재 여부 확인 후 조건부 추가
ALTER TABLE bars ADD COLUMN location geography(Point, 4326);
```

#### 2.2.3 기존 데이터 백필

```sql
UPDATE bars SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

> **주의**: `ST_MakePoint(longitude, latitude)` — longitude이 먼저 온다 (x, y 순서).

#### 2.2.4 GIST 공간 인덱스

```sql
CREATE INDEX idx_bar_location ON bars USING GIST (location);
```

#### 2.2.5 lat/lng → location 동기화 트리거

`latitude`, `longitude` 컬럼이 INSERT/UPDATE될 때 `location`을 자동으로 갱신하는 트리거이다.

```sql
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

CREATE TRIGGER bars_location_trigger
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON bars FOR EACH ROW
  EXECUTE FUNCTION bars_location_update();
```

#### 2.2.6 TriggerInitService — 트리거 자동 보장

`synchronize: true` 또는 `dropSchema: true` 환경에서 DB가 재생성되면 마이그레이션으로 등록된 트리거가 사라진다. `TriggerInitService`는 `OnApplicationBootstrap`을 구현하여 서버 시작 시마다 `bars_search_vector_trigger`와 `bars_location_trigger`의 존재 여부를 `pg_trigger`에서 확인하고, 없을 경우 자동으로 재생성한다.

- **파일 위치**: `backend/src/common/init/trigger-init.service.ts`
- **적용 트리거/확장**: `bars_search_vector_trigger`, `bars_location_trigger`, `pg_trgm 확장 + idx_bar_name_trgm`
- **동작**: 트리거/인덱스가 이미 존재하면 아무 작업도 하지 않음 (idempotent)
- **데이터 백필**: 트리거 생성 직후 기존 데이터에 대해 `searchVector` / `location` 값을 일괄 갱신
- **pg_trgm 보장**: `ensurePgTrgmExtensionAndIndex()` 메서드가 부트 시 `pg_trgm` 확장과 `idx_bar_name_trgm` 인덱스를 보장

> **주의**: `TriggerInitService`는 개발 환경(`synchronize: true`)에서 트리거 소실을 방지하기 위한 안전장치이다. 프로덕션 환경에서는 마이그레이션을 통해 트리거를 관리하고 `synchronize: false`로 운영한다.

#### 2.2.7 근처 바 검색 쿼리 예시

`BarsService.findNearby()`에서 PostGIS 함수를 활용한 공간 검색 쿼리이다.

```sql
-- ST_DWithin: 반경 내 필터 (미터 단위)
-- ST_Distance: 거리 계산 (미터 반환, / 1000으로 km 변환)
SELECT b.id, b.name, b.latitude, b.longitude,
  ROUND(CAST(
    ST_Distance(b.location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000 AS numeric
  ), 1) AS "distanceKm"
FROM bars b
WHERE ST_DWithin(b.location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
ORDER BY "distanceKm" ASC;
-- 파라미터: [$1=lat, $2=lng, $3=radiusKm*1000]
```

---

### 2.3 Raw SQL 마이그레이션: pg_trgm (퍼지 검색)

SPEC-03 검색 기능의 이름 퍼지 매칭(fuzzy search)을 위한 PostgreSQL `pg_trgm` 확장 및 GIN trigram 인덱스 추가이다. 마이그레이션 파일: `1710000000000-add-trgm-gin-indexes.ts`

#### 2.3.1 pg_trgm 확장 활성화 및 GIN trigram 인덱스 생성

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_bar_name_trgm ON bars USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_bar_address_trgm ON bars USING GIN (address gin_trgm_ops);
```

- `pg_trgm`: 문자열 유사도 함수(`similarity()`)와 trigram 인덱스를 제공하는 PostgreSQL 내장 확장이다.
- `idx_bar_name_trgm`: `bars.name` 컬럼에 대한 GIN trigram 인덱스. `similarity(bar.name, :name) > 0.2` 조건에서 인덱스 스캔을 가능하게 한다.
- `idx_bar_address_trgm`: `bars.address` 컬럼에 대한 GIN trigram 인덱스.
- `down` 시 두 인덱스만 삭제하며, `pg_trgm` 확장은 다른 곳에서 사용 가능하므로 삭제하지 않는다.

#### 2.3.2 TriggerInitService — pg_trgm 부트 타임 보장

`TriggerInitService.ensurePgTrgmExtensionAndIndex()` 메서드가 서버 시작 시마다 `pg_trgm` 확장과 `idx_bar_name_trgm` 인덱스의 존재 여부를 확인하고, 없을 경우 자동으로 생성한다.

- `pg_trgm` 확장은 매번 `CREATE EXTENSION IF NOT EXISTS`로 보장 (항상 실행)
- `idx_bar_name_trgm` 인덱스는 `pg_indexes` 뷰를 조회하여 없을 경우에만 생성

---

#### 2.1.6 검색 쿼리 예시

과거/보조 용도의 `searchVector` 활용 예시이다. 현재 공개 API 검색 계약의 1차 기준은 `docs/architecture/api.md`의 이름/위치 기반 검색 명세다.

```typescript
/**
 * searchVector를 활용한 보조 검색 예시.
 * 현재 공개 API의 1차 검색 계약 설명용 예시는 아니다.
 */
async searchBars(q: string, page: number, limit: number) {
  const query = this.barRepository
    .createQueryBuilder('bar')
    .addSelect("ts_rank(bar.\"searchVector\", plainto_tsquery('english', :q))", 'relevance_score')
    .where('bar.status = :status', { status: BarStatus.APPROVED })
    .andWhere("bar.\"searchVector\" @@ plainto_tsquery('english', :q)", { q })
    .orderBy('relevance_score', 'DESC')
    .skip((page - 1) * limit)
    .take(limit)
    .setParameter('q', q);

  const [items, totalItems] = await query.getManyAndCount();
  return { items, totalItems };
}
```
