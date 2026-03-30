import { z } from 'zod';
import { DayOfWeek } from '@my-project/shared';

/** Step 1: Basic info schema */
const barStepBasicSchema = z.object({
  name: z.string().min(1, 'Please enter a name').max(100, 'Name must be 100 characters or less'),
  description: z.string().optional(),
});

/** Step 2: Location schema */
const barStepLocationSchema = z.object({
  address: z.string().min(1, 'Please enter an address').max(255),
  city: z.string().min(1, 'Please enter a city').max(50),
  country: z.string().min(1, 'Please enter a country').max(50),
  latitude: z.number({ error: 'Please enter a latitude' }).min(-90).max(90),
  longitude: z.number({ error: 'Please enter a longitude' }).min(-180).max(180),
  phone: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

/** Step 4-5: Menu items and operating hours schema */
const barStepDetailsSchema = z.object({
  menuItems: z.array(z.object({
    name: z.string().min(1, 'Please enter a menu item name').max(100),
    description: z.string().max(255).optional(),
    price: z.number({ error: 'Please enter a price' }).min(0, 'Price must be 0 or greater'),
    currency: z.literal('USD'),
  })).optional(),
  operatingHours: z.array(z.object({
    dayOfWeek: z.nativeEnum(DayOfWeek),
    openTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please enter a valid time format (HH:MM)'),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please enter a valid time format (HH:MM)'),
    isClosed: z.boolean().optional(),
  })).optional(),
});

/** Full create bar schema */
export const createBarSchema = barStepBasicSchema
  .merge(barStepLocationSchema)
  .merge(barStepDetailsSchema);

export type CreateBarFormValues = z.infer<typeof createBarSchema>;
