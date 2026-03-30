import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import { GoogleOAuthClient } from './google-oauth.client.js';
import {
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL,
} from '../constants/google-oauth.constants.js';

describe('GoogleOAuthClient', () => {
  let client: GoogleOAuthClient;
  let httpService: { post: jest.Mock; get: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          'google.clientId': 'test-client-id',
          'google.clientSecret': 'test-client-secret',
          'google.redirectUri': 'http://localhost/callback',
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuthClient,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    client = module.get<GoogleOAuthClient>(GoogleOAuthClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── getAccessToken ──────────────────────────────────

  describe('getAccessToken', () => {
    it('should POST to Google token endpoint and return access_token', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          access_token: 'mock-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid email profile',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      httpService.post.mockReturnValue(of(mockResponse));

      const result = await client.getAccessToken('auth-code');

      expect(result).toBe('mock-access-token');
      expect(httpService.post).toHaveBeenCalledWith(
        GOOGLE_TOKEN_URL,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should include correct params (code, client_id, client_secret, redirect_uri, grant_type)', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          access_token: 'token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      httpService.post.mockReturnValue(of(mockResponse));

      await client.getAccessToken('auth-code');

      expect(httpService.post).toHaveBeenCalledWith(
        GOOGLE_TOKEN_URL,
        {
          code: 'auth-code',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          redirect_uri: 'http://localhost/callback',
          grant_type: 'authorization_code',
        },

        expect.objectContaining({ timeout: expect.any(Number) }),
      );
    });

    it('should throw UnauthorizedException when Google returns error', async () => {
      const axiosError = new AxiosError(
        'Bad Request',
        '400',
        undefined,
        undefined,
        {
          status: 400,
          data: { error: 'invalid_grant' },
          statusText: 'Bad Request',
          headers: {},
          config: { headers: new AxiosHeaders() },
        } as AxiosResponse,
      );
      httpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(client.getAccessToken('invalid-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on network timeout', async () => {
      const timeoutError = new AxiosError('timeout', 'ECONNABORTED');
      httpService.post.mockReturnValue(throwError(() => timeoutError));

      await expect(client.getAccessToken('code')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── getUserProfile ──────────────────────────────────

  describe('getUserProfile', () => {
    it('should GET userinfo endpoint with Bearer token and return profile', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          sub: 'google-123',
          email: 'test@gmail.com',
          name: 'Test User',
          picture: 'https://photo.url',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      httpService.get.mockReturnValue(of(mockResponse));

      const result = await client.getUserProfile('access-token');

      expect(result).toEqual({
        id: 'google-123',
        email: 'test@gmail.com',
        name: 'Test User',
        picture: 'https://photo.url',
      });
      expect(httpService.get).toHaveBeenCalledWith(
        GOOGLE_USERINFO_URL,
        expect.objectContaining({
          headers: { Authorization: 'Bearer access-token' },
        }),
      );
    });

    it('should map sub to id for backward compatibility', async () => {
      const mockResponse: AxiosResponse = {
        data: { sub: 'sub-456', email: 'user@gmail.com', name: 'User' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      httpService.get.mockReturnValue(of(mockResponse));

      const result = await client.getUserProfile('token');

      expect(result.id).toBe('sub-456');
      expect(result).not.toHaveProperty('sub');
    });

    it('should throw UnauthorizedException when Google returns error', async () => {
      const axiosError = new AxiosError(
        'Unauthorized',
        '401',
        undefined,
        undefined,
        {
          status: 401,
          data: { error: 'invalid_token' },
          statusText: 'Unauthorized',
          headers: {},
          config: { headers: new AxiosHeaders() },
        } as AxiosResponse,
      );
      httpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(client.getUserProfile('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on network timeout', async () => {
      const timeoutError = new AxiosError('timeout', 'ECONNABORTED');
      httpService.get.mockReturnValue(throwError(() => timeoutError));

      await expect(client.getUserProfile('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
