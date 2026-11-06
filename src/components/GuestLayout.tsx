import type { CSSProperties, ReactNode } from 'react';
import { useHotel } from '../hooks/useHotel';

export default function GuestLayout({ children }: { children: ReactNode }) {
  const hotel = useHotel();

  if (!hotel) return <>{children}</>;

  const brandStyles = {
    '--brand-primary': hotel.primary_color ?? '#800000',
    '--brand-secondary': hotel.secondary_color ?? '#d97706',
    '--brand-surface': 'rgba(255, 255, 255, 0.97)',
  } as CSSProperties;

  return (
    <div
      style={{
        ...brandStyles,
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        backgroundImage: hotel.background_url
          ? `linear-gradient(rgba(15, 23, 42, 0.28), rgba(15, 23, 42, 0.28)), url(${hotel.background_url})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        padding: 24,
        fontFamily: 'system-ui',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 18,
            marginBottom: 24,
            borderRadius: 18,
            background: 'var(--brand-surface)',
            border: '1px solid rgba(148, 163, 184, 0.28)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {hotel.logo_url ? (
            <img
              src={hotel.logo_url}
              alt={hotel.name}
              style={{
                height: 52,
                maxWidth: 160,
                width: 'auto',
                borderRadius: 8,
                objectFit: 'contain',
                objectPosition: 'left center',
                display: 'block',
                background: 'transparent',
                border: '1px solid rgba(148,163,184,0.3)',
              }}
            />
          ) : (
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--brand-primary)',
                color: 'white',
                fontWeight: 700,
                fontSize: 20,
              }}
            >
              {hotel.name?.slice(0, 1).toUpperCase() ?? 'R'}
            </div>
          )}

          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: 'var(--brand-primary)' }}>{hotel.name}</h1>
          </div>
        </div>

        <div
          style={{
            padding: 24,
            borderRadius: 18,
            background: 'var(--brand-surface)',
            border: '1px solid rgba(148, 163, 184, 0.28)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
