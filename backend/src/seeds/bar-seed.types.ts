export interface BarSeedData {
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  description: string;
  photos: string[];
  operatingHours: {
    dayOfWeek: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }[];
  menuItems: {
    name: string;
    description?: string;
    price: number;
    currency: string;
  }[];
}

