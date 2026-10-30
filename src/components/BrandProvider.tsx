import { createContext, useContext, type ReactNode, type CSSProperties } from 'react';
import type { Hotel } from '../api/hotels';

const HotelCtx = createContext<Hotel | null>(null);
export const useHotel = () => useContext(HotelCtx);

export function BrandProvider({ hotel, children }: { hotel: Hotel; children: ReactNode }) {
  return (
    <HotelCtx.Provider value={hotel}>
      <div style={{ '--primary-color': hotel.primary_color } as CSSProperties}>
        {children}
      </div>
    </HotelCtx.Provider>
  );
}
