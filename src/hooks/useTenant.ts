import { useEffect, useState } from 'react';
import { getHotelBySubdomain, type Hotel } from '../api/hotels';

export function useTenant() {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function resolve() {
      try {
        const params = new URLSearchParams(window.location.search);
        const host = window.location.hostname;
        const hotelParam = params.get('hotel')?.trim();

        let subdomain = hotelParam ?? '';

        if (!subdomain) {
          if (host === 'localhost' || host === '127.0.0.1') {
            subdomain = 'casamagnolia';
          } else {
            setHotel(null);
            setError('No hotel specified. Please scan a valid QR code.');
            setLoading(false);
            return;
          }
        }

        setRoom(params.get('room'));
        setToken(params.get('t'));

        const result = await getHotelBySubdomain(subdomain);
        if (!result) throw new Error(`No hotel found for "${subdomain}"`);
        setHotel(result);
      } catch (e: any) {
        setError(e.message ?? 'Tenant resolution failed');
      } finally {
        setLoading(false);
      }
    }
    resolve();
  }, []);

  return { hotel, loading, error, room, token };
}
