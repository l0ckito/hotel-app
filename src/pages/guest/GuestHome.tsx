import { useState } from 'react';
import { useHotel } from '../../components/BrandProvider';
import RequestForm from './RequestForm';
import CompendiumPage from './CompendiumPage';
import RecommendationsPage from './RecommendationsPage';

type View = 'home' | 'request' | 'compendium' | 'explore';

export default function GuestHome({ room, token }: { room: string | null; token: string | null }) {
  const hotel = useHotel()!;
  const [view, setView] = useState<View>('home');

  if (view === 'request') return <RequestForm room={room} token={token} onBack={() => setView('home')} />;
  if (view === 'compendium') return <CompendiumPage onBack={() => setView('home')} />;
  if (view === 'explore') return <RecommendationsPage onBack={() => setView('home')} />;

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ color: 'var(--primary-color)' }}>{hotel.name}</h1>
      {room && <p style={{ color: '#666', marginTop: -8 }}>Room {room}</p>}
      <p>Welcome. How can we help you today?</p>

      <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        <button style={btn} onClick={() => setView('compendium')}>📶 Wi-Fi &amp; Info</button>
        <button style={btn} onClick={() => setView('request')}>🛎 Make a Request</button>
        <button style={btn} onClick={() => setView('explore')}>📍 Explore Local</button>
      </div>

      {!token && (
        <p style={{ marginTop: 24, fontSize: 13, color: '#999' }}>
          Scan a room QR code to enable requests.
        </p>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: '18px 20px', fontSize: 16, borderRadius: 12,
  border: '1px solid #eee', background: 'white',
  textAlign: 'left', cursor: 'pointer',
};
