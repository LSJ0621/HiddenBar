import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadGatewayException,
  ServiceUnavailableException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosHeaders } from 'axios';
import { GooglePlacesClient } from './google-places.client.js';
import {
  GOOGLE_PLACES_AUTOCOMPLETE_URL,
  GOOGLE_PLACES_DETAILS_URL,
  GOOGLE_PLACES_FIELD_MASK,
} from '../google.constants.js';

const MOCK_API_KEY = 'test-api-key';

describe('GooglePlacesClient', () => {
  let client: GooglePlacesClient;
  let httpService: { post: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GooglePlacesClient,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(MOCK_API_KEY),
          },
        },
      ],
    }).compile();

    client = module.get<GooglePlacesClient>(GooglePlacesClient);
  });

  describe('autocomplete', () => {
    const mockSuggestions = [
      {
        placePrediction: {
          placeId: 'place_1',
          text: { text: '강남역' },
        },
      },
    ];

    it('should POST to Places Autocomplete API and return predictions', async () => {
      httpService.post.mockReturnValueOnce(
        of({ data: { suggestions: mockSuggestions } }),
      );

      const result = await client.autocomplete('강남역');

      expect(httpService.post).toHaveBeenCalledWith(
        GOOGLE_PLACES_AUTOCOMPLETE_URL,
        { input: '강남역' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Goog-Api-Key': MOCK_API_KEY,
          }),
          timeout: 10000,
        }),
      );
      expect(result).toEqual(mockSuggestions);
    });

    it('should include X-Goog-Api-Key header', async () => {
      httpService.post.mockReturnValueOnce(of({ data: { suggestions: [] } }));

      await client.autocomplete('test');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Goog-Api-Key': MOCK_API_KEY,
          }),
        }),
      );
    });

    it('should include sessionToken in request body when provided', async () => {
      httpService.post.mockReturnValueOnce(of({ data: { suggestions: [] } }));

      await client.autocomplete('test', { sessionToken: 'token-123' });

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ sessionToken: 'token-123' }),
        expect.any(Object),
      );
    });

    it('should include languageCode in request body when provided', async () => {
      httpService.post.mockReturnValueOnce(of({ data: { suggestions: [] } }));

      await client.autocomplete('test', { language: 'ko' });

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ languageCode: 'ko' }),
        expect.any(Object),
      );
    });

    it('should throw BadGatewayException when API call fails', async () => {
      httpService.post.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      await expect(client.autocomplete('test')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('should throw ServiceUnavailableException when API quota exceeded (429)', async () => {
      const axiosError = new AxiosError(
        'Too Many Requests',
        '429',
        undefined,
        undefined,
        {
          status: 429,
          data: {},
          statusText: 'Too Many Requests',
          headers: {},
          config: { headers: new AxiosHeaders() },
        },
      );

      httpService.post.mockReturnValueOnce(throwError(() => axiosError));

      await expect(client.autocomplete('test')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should return empty suggestions when no results', async () => {
      httpService.post.mockReturnValueOnce(of({ data: {} }));

      const result = await client.autocomplete('xyz');
      expect(result).toEqual([]);
    });
  });

  describe('getDetails', () => {
    const mockDetails = {
      displayName: { text: '강남역 2번 출구' },
      formattedAddress: '서울특별시 강남구 강남대로 396',
      addressComponents: [
        { longText: '강남구', shortText: '강남구', types: ['sublocality'] },
      ],
      location: { latitude: 37.498095, longitude: 127.02761 },
    };

    it('should GET Place Details API and return location + addressComponents', async () => {
      httpService.get.mockReturnValueOnce(of({ data: mockDetails }));

      const result = await client.getDetails('place_1');

      expect(httpService.get).toHaveBeenCalledWith(
        `${GOOGLE_PLACES_DETAILS_URL}/place_1`,
        expect.objectContaining({
          timeout: 10000,
        }),
      );
      expect(result).toEqual(mockDetails);
    });

    it('should include X-Goog-FieldMask header', async () => {
      httpService.get.mockReturnValueOnce(of({ data: mockDetails }));

      await client.getDetails('place_1');

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
          }),
        }),
      );
    });

    it('should include sessionToken in header when provided', async () => {
      httpService.get.mockReturnValueOnce(of({ data: mockDetails }));

      await client.getDetails('place_1', { sessionToken: 'token-123' });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Goog-SessionToken': 'token-123',
          }),
        }),
      );
    });

    it('should throw BadGatewayException when API call fails', async () => {
      httpService.get.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      await expect(client.getDetails('place_1')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('should throw NotFoundException when place not found', async () => {
      const axiosError = new AxiosError(
        'Not Found',
        '404',
        undefined,
        undefined,
        {
          status: 404,
          data: {},
          statusText: 'Not Found',
          headers: {},
          config: { headers: new AxiosHeaders() },
        },
      );

      httpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(client.getDetails('invalid_place')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createSessionToken', () => {
    it('should return a valid UUID string', () => {
      const token = client.createSessionToken();
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });
});
