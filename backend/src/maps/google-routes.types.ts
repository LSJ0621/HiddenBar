export interface GoogleLatLng {
  latitude: number;
  longitude: number;
}

export interface GoogleNavigationInstruction {
  instructions?: string;
}

export interface GoogleLocalizedValues {
  distance?: { text: string };
  duration?: { text: string };
}

export interface GoogleTransitStop {
  name?: string;
  location?: { latLng?: GoogleLatLng };
}

export interface GoogleStopDetails {
  arrivalStop?: GoogleTransitStop;
  departureStop?: GoogleTransitStop;
  arrivalTime?: string;
  departureTime?: string;
}

export interface GoogleTransitLine {
  name?: string;
  nameShort?: string;
  color?: string;
  textColor?: string;
  vehicle?: { type?: string };
}

export interface GoogleTransitDetails {
  stopDetails?: GoogleStopDetails;
  transitLine?: GoogleTransitLine;
  stopCount?: number;
}

export interface GoogleStep {
  navigationInstruction?: GoogleNavigationInstruction;
  localizedValues?: GoogleLocalizedValues;
  startLocation?: { latLng?: GoogleLatLng };
  endLocation?: { latLng?: GoogleLatLng };
  distanceMeters?: number;
  staticDuration?: string;
  travelMode?: string;
  transitDetails?: GoogleTransitDetails;
  polyline?: { encodedPolyline?: string };
}

export interface GoogleLeg {
  steps?: GoogleStep[];
}

export interface GoogleRoute {
  duration?: string;
  distanceMeters?: number;
  polyline?: { encodedPolyline?: string };
  legs?: GoogleLeg[];
}

export interface GoogleRoutesResponse {
  routes?: GoogleRoute[];
}
