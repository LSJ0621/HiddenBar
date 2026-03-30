import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumberString,
  validateSync,
} from 'class-validator';

/**
 * 환경변수 검증 스키마. 앱 시작 시 필수 환경변수를 검증한다.
 */
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  POSTGRES_HOST: string;

  @IsNumberString()
  @IsNotEmpty()
  POSTGRES_PORT: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_USER: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_DB: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  @IsString()
  POSTGRES_SYNCHRONIZE?: string;

  @IsOptional()
  @IsString()
  POSTGRES_DROP_SCHEMA?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRATION?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRATION?: string;

  @IsOptional()
  @IsString()
  ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  ADMIN_NAME?: string;

  @IsOptional()
  @IsString()
  LOG_LEVEL?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  GOOGLE_REDIRECT_URI?: string;

  @IsOptional()
  @IsString()
  GOOGLE_MAPS_API_KEY?: string;

  @IsOptional()
  @IsString()
  GOOGLE_MAPS_REFERER?: string;

  @IsOptional()
  @IsString()
  AWS_S3_BUCKET?: string;

  @IsOptional()
  @IsString()
  AWS_S3_REGION?: string;

  @IsOptional()
  @IsString()
  AWS_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  AWS_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsNumberString()
  EMAIL_PORT?: string;

  @IsOptional()
  @IsString()
  EMAIL_SECURE?: string;

  @IsOptional()
  @IsString()
  EMAIL_FROM_NAME?: string;

  @IsOptional()
  @IsString()
  EMAIL_HOST?: string;

  @IsOptional()
  @IsString()
  EMAIL_ADDRESS?: string;

  @IsOptional()
  @IsString()
  EMAIL_PASSWORD?: string;

  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  @IsOptional()
  @IsString()
  COOKIE_SAME_SITE?: string;

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL: string;
}

/**
 * ConfigModule의 validate 함수. 환경변수를 검증하고 변환된 객체를 반환한다.
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation error:\n${errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('\n')}`,
    );
  }

  return validatedConfig;
}
