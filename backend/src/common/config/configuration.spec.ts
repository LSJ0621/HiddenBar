import 'reflect-metadata';
import { validate } from './env.validation.js';

describe('Environment Validation', () => {
  const validConfig = {
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: '5432',
    POSTGRES_USER: 'test',
    POSTGRES_PASSWORD: 'test',
    POSTGRES_DB: 'testdb',
    JWT_SECRET: 'test-secret-key',
    FRONTEND_URL: 'http://localhost:3000',
  };

  it('should pass with all required environment variables', () => {
    expect(() => validate(validConfig)).not.toThrow();
  });

  it('should throw when POSTGRES_HOST is missing', () => {
    const { POSTGRES_HOST, ...config } = validConfig;

    expect(() => validate(config)).toThrow('Environment validation error');
  });

  it('should throw when JWT_SECRET is missing', () => {
    const { JWT_SECRET, ...config } = validConfig;

    expect(() => validate(config)).toThrow('Environment validation error');
  });

  it('should throw when both required variables are missing', () => {
    const config = {};

    expect(() => validate(config)).toThrow('Environment validation error');
  });

  it('should accept optional PORT as numeric string', () => {
    const config = {
      ...validConfig,
      PORT: '3000',
    };

    expect(() => validate(config)).not.toThrow();
  });

  it('should accept optional JWT_ACCESS_EXPIRATION', () => {
    const config = {
      ...validConfig,
      JWT_ACCESS_EXPIRATION: '30m',
    };

    expect(() => validate(config)).not.toThrow();
  });

  it('should accept optional JWT_REFRESH_EXPIRATION', () => {
    const config = {
      ...validConfig,
      JWT_REFRESH_EXPIRATION: '14d',
    };

    expect(() => validate(config)).not.toThrow();
  });

  it('should throw when POSTGRES_HOST is empty string', () => {
    const config = {
      ...validConfig,
      POSTGRES_HOST: '',
    };

    expect(() => validate(config)).toThrow('Environment validation error');
  });

  it('should throw when JWT_SECRET is empty string', () => {
    const config = {
      ...validConfig,
      JWT_SECRET: '',
    };

    expect(() => validate(config)).toThrow('Environment validation error');
  });
});
