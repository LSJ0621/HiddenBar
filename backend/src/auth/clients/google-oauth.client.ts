import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  GOOGLE_OAUTH_TIMEOUT,
} from '../constants/google-oauth.constants.js';
import {
  GoogleTokenResponse,
  GoogleUserProfile,
} from '../interfaces/google-oauth.interface.js';

@Injectable()
export class GoogleOAuthClient {
  private readonly logger = new Logger(GoogleOAuthClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Google OAuth authorization code를 access token으로 교환한다.
   */
  async getAccessToken(code: string): Promise<string> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<GoogleTokenResponse>(
          GOOGLE_TOKEN_URL,
          {
            code,
            client_id: this.configService.get<string>('google.clientId'),
            client_secret: this.configService.get<string>(
              'google.clientSecret',
            ),
            redirect_uri: this.configService.get<string>('google.redirectUri'),
            grant_type: 'authorization_code',
          },
          { timeout: GOOGLE_OAUTH_TIMEOUT },
        ),
      );
      return data.access_token;
    } catch (error) {
      this.logger.warn(
        `Google token exchange failed: ${(error as Error).message}`,
      );
      throw new UnauthorizedException(
        'Invalid authorization code.',
      );
    }
  }

  /**
   * access token으로 Google 사용자 프로필을 조회한다.
   */
  async getUserProfile(accessToken: string): Promise<{
    id: string;
    email: string;
    name: string;
    picture?: string;
  }> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<GoogleUserProfile>(GOOGLE_USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: GOOGLE_OAUTH_TIMEOUT,
        }),
      );
      return {
        id: data.sub,
        email: data.email,
        name: data.name,
        picture: data.picture,
      };
    } catch (error) {
      this.logger.warn(
        `Google profile fetch failed: ${(error as Error).message}`,
      );
      throw new UnauthorizedException('Failed to fetch Google profile.');
    }
  }
}
