/** Autocomplete 요청 바디 */
export interface PlacesAutocompleteRequest {
  input: string;
  languageCode?: string;
  sessionToken?: string;
}

/** Autocomplete 응답의 개별 suggestion */
export interface PlacesAutocompleteSuggestion {
  placePrediction?: {
    placeId: string;
    text?: { text: string };
    structuredFormat?: {
      mainText?: { text: string };
      secondaryText?: { text: string };
    };
  };
}

/** Autocomplete 응답 전체 */
export interface PlacesAutocompleteResponse {
  suggestions?: PlacesAutocompleteSuggestion[];
}

/** Place Details 응답의 addressComponent */
interface PlacesAddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

/** Place Details 응답 */
export interface PlacesDetailsResponse {
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  addressComponents?: PlacesAddressComponent[];
  location?: { latitude: number; longitude: number };
}
