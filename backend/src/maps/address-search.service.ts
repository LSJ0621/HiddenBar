import { Injectable } from '@nestjs/common';
import { GooglePlacesClient } from '../external/google/clients/google-places.client.js';
import type { PlacesDetailsResponse } from '../external/google/google.types.js';

export interface AddressSearchResult {
  displayName: string;
  formattedAddress: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class AddressSearchService {
  constructor(private readonly placesClient: GooglePlacesClient) {}

  /**
   * 주소를 검색하여 장소 목록을 반환한다.
   * autocomplete → getDetails 순으로 호출하여 상세 정보를 조합한다.
   */
  async search(
    query: string,
    language?: string,
  ): Promise<AddressSearchResult[]> {
    const sessionToken = this.placesClient.createSessionToken();

    const suggestions = await this.placesClient.autocomplete(query, {
      language,
      sessionToken,
    });

    if (suggestions.length === 0) {
      return [];
    }

    const results: AddressSearchResult[] = [];

    for (const suggestion of suggestions) {
      const placeId = suggestion.placePrediction?.placeId;
      if (!placeId) continue;

      const details = await this.placesClient.getDetails(placeId, {
        sessionToken,
      });

      results.push(this.toSearchResult(details));
    }

    return results;
  }

  private toSearchResult(details: PlacesDetailsResponse): AddressSearchResult {
    const components = details.addressComponents ?? [];

    return {
      displayName: details.displayName?.text ?? '',
      formattedAddress: details.formattedAddress ?? '',
      city: this.extractCity(components),
      country: this.extractCountry(components),
      latitude: details.location?.latitude ?? 0,
      longitude: details.location?.longitude ?? 0,
    };
  }

  /**
   * addressComponents에서 도시를 추출한다.
   * locality → administrative_area_level_1 순으로 fallback한다.
   */
  private extractCity(
    components: { longText: string; types: string[] }[],
  ): string {
    const locality = components.find((c) => c.types.includes('locality'));
    if (locality) return locality.longText;

    const admin = components.find((c) =>
      c.types.includes('administrative_area_level_1'),
    );
    return admin?.longText ?? '';
  }

  /**
   * addressComponents에서 국가를 추출한다.
   */
  private extractCountry(
    components: { longText: string; types: string[] }[],
  ): string {
    const country = components.find((c) => c.types.includes('country'));
    return country?.longText ?? '';
  }
}
