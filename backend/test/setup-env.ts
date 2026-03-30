import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Jest 워커 프로세스 내에서 .env.test를 로드한다.
 * jest-e2e.json의 setupFiles로 등록되어 테스트 실행 전에 호출된다.
 * override: true로 기존 환경변수를 덮어쓴다.
 */
dotenv.config({
  path: path.resolve(__dirname, '../.env.test'),
  override: true,
});
