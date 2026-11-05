import { type ReactNode, type CSSProperties } from 'react';
import type { Hotel } from '../api/hotels';
import { HotelContext } from '../hooks/useHotel';

export function BrandProvider({ hotel, children }: { hotel: Hotel; children: ReactNode }) {
  return (
    <HotelContext.Provider value={hotel}>
      <div
        style={{
          '--brand-primary': hotel.primary_color ?? '#800000',
          '--brand-secondary': hotel.secondary_color ?? '#d97706',
          '--primary-color': hotel.primary_color ?? '#800000',
        } as CSSProperties}
      >
        {children}
      </div>
    </HotelContext.Provider>
  );
}
