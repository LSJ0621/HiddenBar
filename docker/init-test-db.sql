-- hiddenbar DB에 PostGIS 활성화
\c hiddenbar
CREATE EXTENSION IF NOT EXISTS postgis;

-- 테스트용 데이터베이스 생성 (E2E 테스트에서 사용)
SELECT 'CREATE DATABASE hiddenbar_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hiddenbar_test')\gexec

\c hiddenbar_test
CREATE EXTENSION IF NOT EXISTS postgis;
