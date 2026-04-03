import {
  Injectable,
  Logger,
  NotFoundException,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { TravelMode } from '@my-project/shared';
import { DirectionsDto } from './dto/directions.dto.js';
import type {
  GoogleRoutesResponse,
  GoogleRoute,
  GoogleLeg,
  GoogleStep,
} from './google-routes.types.js';
import {
  GOOGLE_ROUTES_URL,
  GOOGLE_ROUTES_TIMEOUT,
  TRAVEL_MODE_MAP,
  BASE_FIELD_MASK,
  TRANSIT_EXTRA_FIELDS,
  DEFAULT_LINE_COLOR,
  DEFAULT_LINE_TEXT_COLOR,
} from './google-routes.constants.js';

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly apiKey: string;
  private readonly referer: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('google.mapsApiKey') ?? '';
    this.referer = this.configService.get<string>('google.mapsReferer') ?? '';
  }

  /**
   * Google Routes API v2를 통해 길안내를 조회한다.
   */
  async getDirections(dto: DirectionsDto) {
    const mode = dto.mode ?? TravelMode.WALKING;
    const googleMode = TRAVEL_MODE_MAP[mode];
    const fieldMask =
      mode === TravelMode.TRANSIT
        ? BASE_FIELD_MASK + TRANSIT_EXTRA_FIELDS
        : BASE_FIELD_MASK;

    const body = {
      origin: {
        location: {
          latLng: { latitude: dto.originLat, longitude: dto.originLng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: dto.destLat, longitude: dto.destLng },
        },
      },
      travelMode: googleMode,
      languageCode: 'en',
      ...(mode === TravelMode.TRANSIT && {
        computeAlternativeRoutes: true,
      }),
    };

    let data: GoogleRoutesResponse;
    try {
      const response = await firstValueFrom(
        this.httpService.post<GoogleRoutesResponse>(
          GOOGLE_ROUTES_URL,
          body,
          {
            headers: {
              'X-Goog-Api-Key': this.apiKey,
              'X-Goog-FieldMask': fieldMask,
              ...(this.referer && { Referer: this.referer }),
            },
            timeout: GOOGLE_ROUTES_TIMEOUT,
          },
        ),
      );
      data = response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 429) {
          throw new ServiceUnavailableException(
            'Google API quota exceeded.',
          );
        }
        this.logger.error(
          '[MapsService] Google Routes API error:',
          JSON.stringify({
            status: error.response.status,
            statusText: error.response.statusText,
            body: error.response.data as unknown,
            requestTravelMode: googleMode,
          }),
        );
        throw new BadGatewayException('Failed to call Google Routes API.');
      }
      throw new BadGatewayException('Failed to call Google Routes API.');
    }

    if (!data.routes || data.routes.length === 0) {
      throw new NotFoundException('No route found.');
    }

    const routes =
      mode === TravelMode.TRANSIT
        ? data.routes.map((route) => this.transformRoute(route, mode))
        : [this.transformRoute(data.routes[0], mode)];

    return { routes };
  }

  private transformRoute(route: GoogleRoute, mode: TravelMode) {
    const durationSeconds = this.parseDuration(route.duration ?? '0s');
    const distanceMeters = route.distanceMeters ?? 0;

    const rawSteps = (route.legs ?? []).flatMap((leg: GoogleLeg) =>
      (leg.steps ?? []).map((step: GoogleStep) =>
        this.transformStep(step, mode),
      ),
    );

    const steps =
      mode === TravelMode.TRANSIT
        ? this.mergeConsecutiveWalkSteps(rawSteps)
        : rawSteps;

    return {
      summary: '',
      distance: {
        text: this.formatDistance(distanceMeters),
        value: distanceMeters,
      },
      duration: {
        text: this.formatDuration(durationSeconds),
        value: durationSeconds,
      },
      steps,
      overviewPolyline: route.polyline?.encodedPolyline ?? '',
      startAddress: '',
      endAddress: '',
    };
  }

  private transformStep(step: GoogleStep, mode: TravelMode) {
    const instruction = this.stripHtml(
      step.navigationInstruction?.instructions ?? '',
    );

    const stepDistanceMeters = step.distanceMeters ?? 0;
    const stepDurationStr = step.staticDuration ?? '0s';
    const stepDurationSeconds = this.parseDuration(stepDurationStr);

    const stepTravelMode = step.travelMode === 'TRANSIT' ? 'TRANSIT' : 'WALK';

    const result: Record<string, unknown> = {
      instruction,
      distance: {
        text: this.formatDistance(stepDistanceMeters),
        value: stepDistanceMeters,
      },
      duration: {
        text: this.formatDuration(stepDurationSeconds),
        value: stepDurationSeconds,
      },
      startLocation: {
        lat: step.startLocation?.latLng?.latitude ?? 0,
        lng: step.startLocation?.latLng?.longitude ?? 0,
      },
      endLocation: {
        lat: step.endLocation?.latLng?.latitude ?? 0,
        lng: step.endLocation?.latLng?.longitude ?? 0,
      },
      travelMode: mode === TravelMode.TRANSIT ? stepTravelMode : mode,
    };

    if (mode === TravelMode.TRANSIT && step.polyline?.encodedPolyline) {
      result.polylines = [step.polyline.encodedPolyline];
    }

    if (step.transitDetails) {
      const td = step.transitDetails;
      result.transitDetails = {
        departureStop: td.stopDetails?.departureStop?.name ?? '',
        arrivalStop: td.stopDetails?.arrivalStop?.name ?? '',
        departureTime: td.stopDetails?.departureTime ?? '',
        arrivalTime: td.stopDetails?.arrivalTime ?? '',
        lineName: td.transitLine?.name ?? '',
        lineShortName: td.transitLine?.nameShort ?? '',
        lineColor: td.transitLine?.color ?? DEFAULT_LINE_COLOR,
        lineTextColor: td.transitLine?.textColor ?? DEFAULT_LINE_TEXT_COLOR,
        vehicleType: td.transitLine?.vehicle?.type ?? '',
        stopCount: td.stopCount ?? 0,
      };
    }

    return result;
  }

  /**
   * 연속된 WALK step들을 하나로 병합한다.
   * distance/duration 합산, polylines 누적, 위치는 첫/마지막 것 사용.
   */
  private mergeConsecutiveWalkSteps(
    steps: Record<string, unknown>[],
  ): Record<string, unknown>[] {
    const merged: Record<string, unknown>[] = [];

    for (const step of steps) {
      const last = merged[merged.length - 1];
      if (last && last.travelMode === 'WALK' && step.travelMode === 'WALK') {
        const lastDist = last.distance as { text: string; value: number };
        const stepDist = step.distance as { text: string; value: number };
        const newDistValue = lastDist.value + stepDist.value;

        const lastDur = last.duration as { text: string; value: number };
        const stepDur = step.duration as { text: string; value: number };
        const newDurValue = lastDur.value + stepDur.value;

        last.distance = {
          text: this.formatDistance(newDistValue),
          value: newDistValue,
        };
        last.duration = {
          text: this.formatDuration(newDurValue),
          value: newDurValue,
        };
        last.endLocation = step.endLocation;
        last.instruction = '';

        const lastPolylines = (last.polylines as string[] | undefined) ?? [];
        const stepPolylines = (step.polylines as string[] | undefined) ?? [];
        if (lastPolylines.length > 0 || stepPolylines.length > 0) {
          last.polylines = [...lastPolylines, ...stepPolylines];
        }
      } else {
        merged.push({ ...step });
      }
    }

    return merged;
  }

  private parseDuration(durationStr: string): number {
    if (!durationStr) return 0;
    const match = durationStr.match(/(\d+)s/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} secs`;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} mins`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hours} hr ${remainMins} mins` : `${hours} hr`;
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) return `${meters} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}
