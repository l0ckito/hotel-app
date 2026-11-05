import { createContext, useContext } from 'react';
import type { Hotel } from '../api/hotels';

export const HotelContext = createContext<Hotel | null>(null);

export function useHotel() {
  return useContext(HotelContext);
}

export type HotelBranding = Pick<Hotel, 'logo_url' | 'background_url' | 'primary_color' | 'secondary_color'>;
