import type { BarStatus, DayOfWeek } from '@my-project/shared';
import type { LatLng } from './common';

/** Bar photo */
export interface BarPhoto {
  id: number;
  url: string;
  order: number;
}

/** Menu item */
export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
}

/** Operating hour for a day */
export interface OperatingHour {
  id: number;
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

/** Bar detail (full) */
export interface BarDetail {
  id: number;
  name: string;
  description: string | null;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  status: BarStatus;
  owner: { id: number; name: string };
  photos: BarPhoto[];
  menuItems: MenuItem[];
  operatingHours: OperatingHour[];
  isBookmarked?: boolean;
  bookmarkCount: number;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
}

/** Create bar DTO */
export interface CreateBarDto {
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  menuItems?: Array<{
    name: string;
    description?: string;
    price: number;
    currency?: string;
  }>;
  operatingHours?: Array<{
    dayOfWeek: DayOfWeek;
    openTime: string;
    closeTime: string;
    isClosed?: boolean;
  }>;
}

/** Update bar DTO */
export type UpdateBarDto = Partial<CreateBarDto>;

/** My bar list item */
export interface MyBarItem {
  id: number;
  name: string;
  city: string;
  country: string;
  status: BarStatus;
  thumbnail: string | null;
  createdAt: string;
}

/** Directions route */
export interface DirectionsRoute {
  summary: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  steps: DirectionsStep[];
  overviewPolyline: string;
  startAddress: string;
  endAddress: string;
}

/** Transit detail for a TRANSIT step */
export interface TransitDetail {
  departureStop: string;
  arrivalStop: string;
  departureTime: string;
  arrivalTime: string;
  lineName: string;
  lineShortName: string;
  lineColor: string;
  lineTextColor: string;
  vehicleType: string;
  stopCount: number;
}

/** Directions step */
export interface DirectionsStep {
  instruction: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  startLocation: LatLng;
  endLocation: LatLng;
  travelMode: string;
  polylines?: string[];
  transitDetails?: TransitDetail;
}

/** Directions API response */
export interface DirectionsResponse {
  routes: DirectionsRoute[];
}
