/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AddressSearchService } from './address-search.service.js';
import { GooglePlacesClient } from '../external/google/clients/google-places.client.js';

describe('AddressSearchService', () => {
  let service: AddressSearchService;
  let placesClient: jest.Mocked<GooglePlacesClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressSearchService,
        {
          provide: GooglePlacesClient,
          useValue: {
            autocomplete: jest.fn(),
            getDetails: jest.fn(),
            createSessionToken: jest.fn().mockReturnValue('session-token-123'),
          },
        },
      ],
    }).compile();

    service = module.get<AddressSearchService>(AddressSearchService);
    placesClient = module.get(GooglePlacesClient);
  });

  describe('search', () => {
    it('should call autocomplete then getDetails for each result and return formatted results', async () => {
      placesClient.autocomplete.mockResolvedValue([
        { placePrediction: { placeId: 'place_1', text: { text: '강남역' } } },
      ]);
      placesClient.getDetails.mockResolvedValue({
        displayName: { text: '강남역 2번 출구' },
        formattedAddress: '서울특별시 강남구 강남대로 396',
        addressComponents: [
          { longText: '서울특별시', shortText: '서울', types: ['locality'] },
          {
            longText: '대한민국',
            shortText: 'KR',
            types: ['country'],
          },
        ],
        location: { latitude: 37.498095, longitude: 127.02761 },
      });

      const results = await service.search('강남역');

      expect(placesClient.autocomplete).toHaveBeenCalledWith('강남역', {
        sessionToken: 'session-token-123',
      });
      expect(placesClient.getDetails).toHaveBeenCalledWith('place_1', {
        sessionToken: 'session-token-123',
      });
      expect(results).toEqual([
        {
          displayName: '강남역 2번 출구',
          formattedAddress: '서울특별시 강남구 강남대로 396',
          city: '서울특별시',
          country: '대한민국',
          latitude: 37.498095,
          longitude: 127.02761,
        },
      ]);
    });

    it('should extract city from locality addressComponent', async () => {
      placesClient.autocomplete.mockResolvedValue([
        { placePrediction: { placeId: 'p1' } },
      ]);
      placesClient.getDetails.mockResolvedValue({
        displayName: { text: 'Test' },
        formattedAddress: 'Test Address',
        addressComponents: [
          { longText: '부산광역시', shortText: '부산', types: ['locality'] },
          {
            longText: '경상남도',
            shortText: '경남',
            types: ['administrative_area_level_1'],
          },
        ],
        location: { latitude: 35.1, longitude: 129.0 },
      });

      const results = await service.search('부산');
      expect(results[0].city).toBe('부산광역시');
    });

    it('should fallback to administrative_area_level_1 when locality not found', async () => {
      placesClient.autocomplete.mockResolvedValue([
        { placePrediction: { placeId: 'p1' } },
      ]);
      placesClient.getDetails.mockResolvedValue({
        displayName: { text: 'Test' },
        formattedAddress: 'Test Address',
        addressComponents: [
          {
            longText: '경기도',
            shortText: '경기',
            types: ['administrative_area_level_1'],
          },
        ],
        location: { latitude: 37.0, longitude: 127.0 },
      });

      const results = await service.search('경기');
      expect(results[0].city).toBe('경기도');
    });

    it('should extract country from country addressComponent', async () => {
      placesClient.autocomplete.mockResolvedValue([
        { placePrediction: { placeId: 'p1' } },
      ]);
      placesClient.getDetails.mockResolvedValue({
        displayName: { text: 'Test' },
        formattedAddress: 'Test Address',
        addressComponents: [
          { longText: '대한민국', shortText: 'KR', types: ['country'] },
        ],
        location: { latitude: 37.0, longitude: 127.0 },
      });

      const results = await service.search('test');
      expect(results[0].country).toBe('대한민국');
    });

    it('should return empty results when autocomplete returns no suggestions', async () => {
      placesClient.autocomplete.mockResolvedValue([]);

      const results = await service.search('xyznonexistent');
      expect(results).toEqual([]);
      expect(placesClient.getDetails).not.toHaveBeenCalled();
    });

    it('should pass language option to autocomplete', async () => {
      placesClient.autocomplete.mockResolvedValue([]);

      await service.search('test', 'ko');

      expect(placesClient.autocomplete).toHaveBeenCalledWith('test', {
        language: 'ko',
        sessionToken: 'session-token-123',
      });
    });
  });
});
