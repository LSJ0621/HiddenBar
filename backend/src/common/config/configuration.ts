/**
 * ConfigModule 설정 팩토리.
 * 환경변수를 그룹화하여 타입 안전하게 제공한다.
 */
export const BCRYPT_SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 1 : 12;

export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  database: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true',
    dropSchema:
      process.env.NODE_ENV === 'production'
        ? false
        : process.env.POSTGRES_DROP_SCHEMA === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    mapsReferer: process.env.GOOGLE_MAPS_REFERER,
  },
  aws: {
    s3Bucket: process.env.AWS_S3_BUCKET,
    s3Region: process.env.AWS_S3_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN ?? 'localhost',
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.COOKIE_SAME_SITE ?? 'lax') as 'lax' | 'strict' | 'none',
  },
  email: {
    host: process.env.EMAIL_HOST ?? 'smtp.naver.com',
    port: parseInt(process.env.EMAIL_PORT ?? '465', 10),
    secure: process.env.EMAIL_SECURE !== 'false',
    address: process.env.EMAIL_ADDRESS,
    password: process.env.EMAIL_PASSWORD,
    fromName: process.env.EMAIL_FROM_NAME ?? 'HiddenBar',
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME ?? 'Admin',
  },
});
