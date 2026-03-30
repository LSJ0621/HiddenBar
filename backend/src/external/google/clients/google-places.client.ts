import { randomUUID } from 'node:crypto';
import {
  Injectable,
  BadGatewayException,
  ServiceUnavailableException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
  GOOGLE_PLACES_AUTOCOMPLETE_URL,
  GOOGLE_PLACES_DETAILS_URL,
  GOOGLE_PLACES_FIELD_MASK,
} from '../google.constants.js';
import type {
  PlacesAutocompleteRequest,
  PlacesAutocompleteResponse,
  PlacesAutocompleteSuggestion,
  PlacesDetailsResponse,
} from '../google.types.js';

interface AutocompleteOptions {
  language?: string;
  sessionToken?: string;
}

interface DetailsOptions {
  sessionToken?: string;
}

@Injectable()
export class GooglePlacesClient {
  private readonly logger = new Logger(GooglePlacesClient.name);
  private readonly apiKey: string;
  private readonly mapsReferer: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('google.mapsApiKey') ?? '';
    this.mapsReferer =
      this.configService.get<string>('google.mapsReferer') ??
      'http://localhost:4000';
  }

  /**
   * Google Places Autocomplete API를 호출하여 장소 예측 목록을 반환한다.
   */
  async autocomplete(
    query: string,
    options?: AutocompleteOptions,
  ): Promise<PlacesAutocompleteSuggestion[]> {
    const body: PlacesAutocompleteRequest = {
      input: query,
    };
    if (options?.language) {
      body.languageCode = options.language;
    }
    if (options?.sessionToken) {
      body.sessionToken = options.sessionToken;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<PlacesAutocompleteResponse>(
          GOOGLE_PLACES_AUTOCOMPLETE_URL,
          body,
          {
            headers: {
              'X-Goog-Api-Key': this.apiKey,
              Referer: this.mapsReferer,
            },
            timeout: 10000,
          },
        ),
      );
      return data.suggestions ?? [];
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        this.logger.error(
          `Google Places Autocomplete 실패 — status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`,
        );
        if (error.response.status === 429) {
          throw new ServiceUnavailableException(
            'API quota exceeded. Please try again later.',
          );
        }
        throw new BadGatewayException(
          'Google Places Autocomplete API call failed.',
        );
      }
      this.logger.error(
        `Google Places Autocomplete 실패 — message: ${error instanceof Error ? error.message : error}`,
      );
      throw new BadGatewayException(
        'Google Places Autocomplete API call failed.',
      );
    }
  }

  /**
   * Google Places Details API를 호출하여 장소 상세 정보를 반환한다.
   */
  async getDetails(
    placeId: string,
    options?: DetailsOptions,
  ): Promise<PlacesDetailsResponse> {
    const headers: Record<string, string> = {
      'X-Goog-Api-Key': this.apiKey,
      'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
      Referer: this.mapsReferer,
    };
    if (options?.sessionToken) {
      headers['X-Goog-SessionToken'] = options.sessionToken;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<PlacesDetailsResponse>(
          `${GOOGLE_PLACES_DETAILS_URL}/${placeId}`,
          {
            headers,
            timeout: 10000,
          },
        ),
      );
      return data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 404) {
          throw new NotFoundException('Place not found.');
        }
        if (error.response.status === 429) {
          throw new ServiceUnavailableException(
            'API quota exceeded. Please try again later.',
          );
        }
        throw new BadGatewayException(
          'Google Places Details API call failed.',
        );
      }
      throw new BadGatewayException(
        'Google Places Details API call failed.',
      );
    }
  }

  /**
   * 빌링 최적화를 위한 세션 토큰을 생성한다.
   */
  createSessionToken(): string {
    return randomUUID();
  }
}
