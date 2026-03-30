import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosHeaders } from 'axios';
import { MapsService } from './maps.service.js';
import { TravelMode } from '@my-project/shared';

describe('MapsService', () => {
  let service: MapsService;
  let httpService: { post: jest.Mock };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'google.mapsApiKey') return 'test-api-key';
      return null;
    }),
  };

  const mockGoogleResponse = {
    routes: [
      {
        duration: '900s',
        distanceMeters: 1200,
        polyline: { encodedPolyline: 'encoded_polyline_string' },
        legs: [
          {
            steps: [
              {
                navigationInstruction: {
                  instructions: '<b>Head north</b> on <b>Soi 11</b>',
                },
                distanceMeters: 200,
                staticDuration: '180s',
                startLocation: {
                  latLng: { latitude: 13.75, longitude: 100.5 },
                },
                endLocation: {
                  latLng: { latitude: 13.752, longitude: 100.5 },
                },
              },
            ],
          },
        ],
      },
    ],
  };

  const validDto = {
    originLat: 13.75,
    originLng: 100.5,
    destLat: 13.76,
    destLng: 100.51,
    mode: TravelMode.WALKING,
  };

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapsService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MapsService>(MapsService);
  });

  // 1. Successfully parses route response
  it('should parse route response with all fields correctly transformed', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    const result = await service.getDirections(validDto);

    expect(result.routes).toHaveLength(1);
    const route = result.routes[0];
    expect(route.duration.value).toBe(900);
    expect(route.distance.value).toBe(1200);
    expect(route.overviewPolyline).toBe('encoded_polyline_string');
    expect(route.steps).toHaveLength(1);
    expect(route.steps[0].instruction).toBe('Head north on Soi 11');
    expect(route.steps[0].startLocation).toEqual({ lat: 13.75, lng: 100.5 });
    expect(route.steps[0].endLocation).toEqual({ lat: 13.752, lng: 100.5 });
  });

  // 2. WALKING → WALK
  it('should map TravelMode.WALKING to WALK in request body', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections({ ...validDto, mode: TravelMode.WALKING });

    const requestBody = httpService.post.mock.calls[0][1];
    expect(requestBody.travelMode).toBe('WALK');
  });

  // 3. DRIVING → DRIVE
  it('should map TravelMode.DRIVING to DRIVE in request body', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections({ ...validDto, mode: TravelMode.DRIVING });

    const requestBody = httpService.post.mock.calls[0][1];
    expect(requestBody.travelMode).toBe('DRIVE');
  });

  // 4. TRANSIT → TRANSIT
  it('should map TravelMode.TRANSIT to TRANSIT in request body', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections({ ...validDto, mode: TravelMode.TRANSIT });

    const requestBody = httpService.post.mock.calls[0][1];
    expect(requestBody.travelMode).toBe('TRANSIT');
  });

  // 5. Duration parsing
  it('should parse duration string "900s" to 900 seconds', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    const result = await service.getDirections(validDto);
    expect(result.routes[0].duration.value).toBe(900);
    expect(result.routes[0].duration.text).toBe('15 mins');
  });

  // 6. Distance formatting
  it('should format distance 1200m as "1.2 km"', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    const result = await service.getDirections(validDto);
    expect(result.routes[0].distance.text).toBe('1.2 km');
    expect(result.routes[0].distance.value).toBe(1200);
  });

  // 7. HTML tag stripping
  it('should strip HTML tags from navigation instructions', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    const result = await service.getDirections(validDto);
    expect(result.routes[0].steps[0].instruction).toBe('Head north on Soi 11');
  });

  // 8. Empty routes → NotFoundException
  it('should throw NotFoundException when no routes found', async () => {
    httpService.post.mockReturnValue(of({ data: { routes: [] } }));

    await expect(service.getDirections(validDto)).rejects.toThrow(
      NotFoundException,
    );
  });

  // 9. Google 429 → ServiceUnavailableException
  it('should throw ServiceUnavailableException on Google 429', async () => {
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

    httpService.post.mockReturnValue(throwError(() => axiosError));

    await expect(service.getDirections(validDto)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  // 10. Google 400/403 → BadGatewayException
  it('should throw BadGatewayException on Google 400/403', async () => {
    const axiosError = new AxiosError(
      'Forbidden',
      '403',
      undefined,
      undefined,
      {
        status: 403,
        data: {},
        statusText: 'Forbidden',
        headers: {},
        config: { headers: new AxiosHeaders() },
      },
    );

    httpService.post.mockReturnValue(throwError(() => axiosError));

    await expect(service.getDirections(validDto)).rejects.toThrow(
      BadGatewayException,
    );
  });

  // 11. Network error → BadGatewayException
  it('should throw BadGatewayException on network error', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    await expect(service.getDirections(validDto)).rejects.toThrow(
      BadGatewayException,
    );
  });

  // 12a. TRANSIT mode should include transitDetails in FieldMask
  it('should include transitDetails in FieldMask for TRANSIT mode', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections({ ...validDto, mode: TravelMode.TRANSIT });

    const config = httpService.post.mock.calls[0][2];
    expect(config.headers['X-Goog-FieldMask']).toContain('transitDetails');
  });

  // 12b. Non-TRANSIT mode should NOT include transitDetails in FieldMask
  it('should NOT include transitDetails in FieldMask for WALKING mode', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections({ ...validDto, mode: TravelMode.WALKING });

    const config = httpService.post.mock.calls[0][2];
    expect(config.headers['X-Goog-FieldMask']).not.toContain('transitDetails');
  });

  // 12c. Transit step should include transitDetails in response
  it('should transform transit step with transitDetails', async () => {
    const transitResponse = {
      routes: [
        {
          duration: '1800s',
          distanceMeters: 5000,
          polyline: { encodedPolyline: 'encoded' },
          legs: [
            {
              steps: [
                {
                  navigationInstruction: { instructions: 'Walk to station' },
                  distanceMeters: 200,
                  staticDuration: '180s',
                  travelMode: 'WALK',
                  startLocation: {
                    latLng: { latitude: 37.5, longitude: 127.0 },
                  },
                  endLocation: {
                    latLng: { latitude: 37.501, longitude: 127.0 },
                  },
                },
                {
                  navigationInstruction: { instructions: 'Take subway' },
                  distanceMeters: 4500,
                  staticDuration: '1200s',
                  travelMode: 'TRANSIT',
                  startLocation: {
                    latLng: { latitude: 37.501, longitude: 127.0 },
                  },
                  endLocation: {
                    latLng: { latitude: 37.55, longitude: 127.05 },
                  },
                  transitDetails: {
                    stopDetails: {
                      departureStop: { name: '강남역' },
                      arrivalStop: { name: '서울역' },
                      departureTime: '2026-03-11T09:00:00Z',
                      arrivalTime: '2026-03-11T09:20:00Z',
                    },
                    transitLine: {
                      name: '2호선',
                      nameShort: '2',
                      color: '#33A23D',
                      textColor: '#FFFFFF',
                      vehicle: { type: 'SUBWAY' },
                    },
                    stopCount: 5,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    httpService.post.mockReturnValue(of({ data: transitResponse }));

    const result = await service.getDirections({
      ...validDto,
      mode: TravelMode.TRANSIT,
    });

    const steps = result.routes[0].steps;
    expect(steps).toHaveLength(2);

    // WALK step
    expect(steps[0].travelMode).toBe('WALK');
    expect(steps[0]).not.toHaveProperty('transitDetails');

    // TRANSIT step
    expect(steps[1].travelMode).toBe('TRANSIT');
    expect(steps[1].transitDetails).toEqual({
      departureStop: '강남역',
      arrivalStop: '서울역',
      departureTime: '2026-03-11T09:00:00Z',
      arrivalTime: '2026-03-11T09:20:00Z',
      lineName: '2호선',
      lineShortName: '2',
      lineColor: '#33A23D',
      lineTextColor: '#FFFFFF',
      vehicleType: 'SUBWAY',
      stopCount: 5,
    });
  });

  // 14. TRANSIT FieldMask includes step polyline
  it('should include step polyline in FieldMask for TRANSIT mode', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections({ ...validDto, mode: TravelMode.TRANSIT });

    const config = httpService.post.mock.calls[0][2];
    expect(config.headers['X-Goog-FieldMask']).toContain(
      'routes.legs.steps.polyline.encodedPolyline',
    );
  });

  // 15. WALKING FieldMask does NOT include step polyline
  it('should NOT include step polyline in FieldMask for WALKING mode', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections({ ...validDto, mode: TravelMode.WALKING });

    const config = httpService.post.mock.calls[0][2];
    expect(config.headers['X-Goog-FieldMask']).not.toContain(
      'routes.legs.steps.polyline',
    );
  });

  // 16. TRANSIT step includes polylines array
  it('should include polylines array in TRANSIT step', async () => {
    const transitResponse = {
      routes: [
        {
          duration: '600s',
          distanceMeters: 3000,
          polyline: { encodedPolyline: 'overview' },
          legs: [
            {
              steps: [
                {
                  navigationInstruction: { instructions: 'Walk' },
                  distanceMeters: 200,
                  staticDuration: '120s',
                  travelMode: 'WALK',
                  startLocation: {
                    latLng: { latitude: 37.5, longitude: 127.0 },
                  },
                  endLocation: {
                    latLng: { latitude: 37.501, longitude: 127.0 },
                  },
                  polyline: { encodedPolyline: 'walk_poly' },
                },
                {
                  navigationInstruction: { instructions: 'Take subway' },
                  distanceMeters: 2800,
                  staticDuration: '480s',
                  travelMode: 'TRANSIT',
                  startLocation: {
                    latLng: { latitude: 37.501, longitude: 127.0 },
                  },
                  endLocation: {
                    latLng: { latitude: 37.55, longitude: 127.05 },
                  },
                  polyline: { encodedPolyline: 'transit_poly' },
                  transitDetails: {
                    stopDetails: {
                      departureStop: { name: '강남역' },
                      arrivalStop: { name: '서울역' },
                      departureTime: '2026-03-11T09:00:00Z',
                      arrivalTime: '2026-03-11T09:08:00Z',
                    },
                    transitLine: {
                      name: '2호선',
                      nameShort: '2',
                      color: '#33A23D',
                      textColor: '#FFFFFF',
                      vehicle: { type: 'SUBWAY' },
                    },
                    stopCount: 3,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    httpService.post.mockReturnValue(of({ data: transitResponse }));

    const result = await service.getDirections({
      ...validDto,
      mode: TravelMode.TRANSIT,
    });

    const steps = result.routes[0].steps;
    expect(steps[0].polylines).toEqual(['walk_poly']);
    expect(steps[1].polylines).toEqual(['transit_poly']);
  });

  // 17. Consecutive WALK steps are merged
  it('should merge consecutive WALK steps in TRANSIT mode', async () => {
    const transitResponse = {
      routes: [
        {
          duration: '1800s',
          distanceMeters: 5000,
          polyline: { encodedPolyline: 'overview' },
          legs: [
            {
              steps: [
                {
                  navigationInstruction: { instructions: 'Walk to entrance' },
                  distanceMeters: 100,
                  staticDuration: '60s',
                  travelMode: 'WALK',
                  startLocation: {
                    latLng: { latitude: 37.5, longitude: 127.0 },
                  },
                  endLocation: {
                    latLng: { latitude: 37.501, longitude: 127.0 },
                  },
                  polyline: { encodedPolyline: 'poly_a' },
                },
                {
                  navigationInstruction: { instructions: 'Continue walking' },
                  distanceMeters: 50,
                  staticDuration: '30s',
                  travelMode: 'WALK',
                  startLocation: {
                    latLng: { latitude: 37.501, longitude: 127.0 },
                  },
                  endLocation: {
                    latLng: { latitude: 37.502, longitude: 127.0 },
                  },
                  polyline: { encodedPolyline: 'poly_b' },
                },
                {
                  navigationInstruction: { instructions: 'Take subway' },
                  distanceMeters: 4850,
                  staticDuration: '1200s',
                  travelMode: 'TRANSIT',
                  startLocation: {
                    latLng: { latitude: 37.502, longitude: 127.0 },
                  },
                  endLocation: {
                    latLng: { latitude: 37.55, longitude: 127.05 },
                  },
                  polyline: { encodedPolyline: 'poly_transit' },
                  transitDetails: {
                    stopDetails: {
                      departureStop: { name: '강남역' },
                      arrivalStop: { name: '서울역' },
                      departureTime: '2026-03-11T09:00:00Z',
                      arrivalTime: '2026-03-11T09:20:00Z',
                    },
                    transitLine: {
                      name: '2호선',
                      nameShort: '2',
                      color: '#33A23D',
                      textColor: '#FFFFFF',
                      vehicle: { type: 'SUBWAY' },
                    },
                    stopCount: 5,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    httpService.post.mockReturnValue(of({ data: transitResponse }));

    const result = await service.getDirections({
      ...validDto,
      mode: TravelMode.TRANSIT,
    });

    const steps = result.routes[0].steps;
    // Two WALK steps merged into one
    expect(steps).toHaveLength(2);

    // Merged WALK step
    expect(steps[0].travelMode).toBe('WALK');
    expect(steps[0].distance).toEqual({ text: '150 m', value: 150 });
    expect(steps[0].duration).toEqual({ text: '2 mins', value: 90 });
    expect(steps[0].startLocation).toEqual({ lat: 37.5, lng: 127.0 });
    expect(steps[0].endLocation).toEqual({ lat: 37.502, lng: 127.0 });
    expect(steps[0].polylines).toEqual(['poly_a', 'poly_b']);

    // TRANSIT step unchanged
    expect(steps[1].travelMode).toBe('TRANSIT');
    expect(steps[1].polylines).toEqual(['poly_transit']);
  });

  // 18. Non-TRANSIT mode does not merge steps
  it('should NOT merge WALK steps in WALKING mode', async () => {
    const walkingResponse = {
      routes: [
        {
          duration: '180s',
          distanceMeters: 300,
          polyline: { encodedPolyline: 'overview' },
          legs: [
            {
              steps: [
                {
                  navigationInstruction: { instructions: 'Step 1' },
                  distanceMeters: 100,
                  staticDuration: '60s',
                  travelMode: 'WALK',
                  startLocation: {
                    latLng: { latitude: 37.5, longitude: 127.0 },
                  },
                  endLocation: {
                    latLng: { latitude: 37.501, longitude: 127.0 },
                  },
                },
                {
                  navigationInstruction: { instructions: 'Step 2' },
                  distanceMeters: 200,
                  staticDuration: '120s',
                  travelMode: 'WALK',
                  startLocation: {
                    latLng: { latitude: 37.501, longitude: 127.0 },
                  },
                  endLocation: {
                    latLng: { latitude: 37.502, longitude: 127.0 },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    httpService.post.mockReturnValue(of({ data: walkingResponse }));

    const result = await service.getDirections({
      ...validDto,
      mode: TravelMode.WALKING,
    });

    // Steps should not be merged
    expect(result.routes[0].steps).toHaveLength(2);
    expect(result.routes[0].steps[0]).not.toHaveProperty('polylines');
    expect(result.routes[0].steps[1]).not.toHaveProperty('polylines');
  });

  // 19. TRANSIT request body should include computeAlternativeRoutes: true
  it('should include computeAlternativeRoutes: true in request body for TRANSIT mode', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections({ ...validDto, mode: TravelMode.TRANSIT });

    const requestBody = httpService.post.mock.calls[0][1];
    expect(requestBody.computeAlternativeRoutes).toBe(true);
  });

  // 20. WALKING request body should NOT include computeAlternativeRoutes
  it('should NOT include computeAlternativeRoutes in request body for WALKING mode', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections({ ...validDto, mode: TravelMode.WALKING });

    const requestBody = httpService.post.mock.calls[0][1];
    expect(requestBody.computeAlternativeRoutes).toBeUndefined();
  });

  // 21. DRIVING request body should NOT include computeAlternativeRoutes
  it('should NOT include computeAlternativeRoutes in request body for DRIVING mode', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections({ ...validDto, mode: TravelMode.DRIVING });

    const requestBody = httpService.post.mock.calls[0][1];
    expect(requestBody.computeAlternativeRoutes).toBeUndefined();
  });

  // 22. TRANSIT should return multiple routes when API returns alternatives
  it('should return multiple routes for TRANSIT mode when API returns alternatives', async () => {
    const multiRouteResponse = {
      routes: [
        {
          duration: '1800s',
          distanceMeters: 5000,
          polyline: { encodedPolyline: 'route1_poly' },
          legs: [{ steps: [] }],
        },
        {
          duration: '2100s',
          distanceMeters: 6000,
          polyline: { encodedPolyline: 'route2_poly' },
          legs: [{ steps: [] }],
        },
        {
          duration: '2400s',
          distanceMeters: 7000,
          polyline: { encodedPolyline: 'route3_poly' },
          legs: [{ steps: [] }],
        },
      ],
    };

    httpService.post.mockReturnValue(of({ data: multiRouteResponse }));

    const result = await service.getDirections({
      ...validDto,
      mode: TravelMode.TRANSIT,
    });

    expect(result.routes).toHaveLength(3);
    expect(result.routes[0].overviewPolyline).toBe('route1_poly');
    expect(result.routes[1].overviewPolyline).toBe('route2_poly');
    expect(result.routes[2].overviewPolyline).toBe('route3_poly');
  });

  // 23. WALKING should return single route even if API returns multiple
  it('should return single route for WALKING mode even if API returns multiple', async () => {
    const multiRouteResponse = {
      routes: [
        {
          duration: '900s',
          distanceMeters: 1200,
          polyline: { encodedPolyline: 'route1' },
          legs: [{ steps: [] }],
        },
        {
          duration: '1200s',
          distanceMeters: 1500,
          polyline: { encodedPolyline: 'route2' },
          legs: [{ steps: [] }],
        },
      ],
    };

    httpService.post.mockReturnValue(of({ data: multiRouteResponse }));

    const result = await service.getDirections({
      ...validDto,
      mode: TravelMode.WALKING,
    });

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].overviewPolyline).toBe('route1');
  });

  // 24. DRIVING should return single route even if API returns multiple
  it('should return single route for DRIVING mode even if API returns multiple', async () => {
    const multiRouteResponse = {
      routes: [
        {
          duration: '600s',
          distanceMeters: 3000,
          polyline: { encodedPolyline: 'drive1' },
          legs: [{ steps: [] }],
        },
        {
          duration: '700s',
          distanceMeters: 3500,
          polyline: { encodedPolyline: 'drive2' },
          legs: [{ steps: [] }],
        },
      ],
    };

    httpService.post.mockReturnValue(of({ data: multiRouteResponse }));

    const result = await service.getDirections({
      ...validDto,
      mode: TravelMode.DRIVING,
    });

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].overviewPolyline).toBe('drive1');
  });

  // 13. Correct headers/FieldMask
  it('should send correct headers and FieldMask in request', async () => {
    httpService.post.mockReturnValue(of({ data: mockGoogleResponse }));

    await service.getDirections(validDto);

    expect(httpService.post).toHaveBeenCalledWith(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Goog-Api-Key': 'test-api-key',
          'X-Goog-FieldMask': expect.stringContaining('routes.duration'),
        }),
        timeout: 10000,
      }),
    );
  });
});
