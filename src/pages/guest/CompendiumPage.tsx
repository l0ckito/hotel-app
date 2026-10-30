import { useEffect, useState } from 'react';
import { useHotel } from '../../components/BrandProvider';
import { getCompendium, type CompendiumEntry } from '../../api/compendium';

export default function CompendiumPage({ onBack }: { onBack: () => void }) {
  const hotel = useHotel()!;
  const [entries, setEntries] = useState<CompendiumEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompendium(hotel.id)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [hotel.id]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto' }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <h2 style={{ color: 'var(--primary-color)' }}>Hotel info</h2>

      {loading && <p>Loading…</p>}
      {!loading && entries.length === 0 && <p>No info yet.</p>}

      <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
        {entries.map((e) => (
          <div key={e.id} style={{ padding: 16, borderRadius: 12, border: '1px solid #eee', background: 'white' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-color)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {e.section}
            </div>
            <div style={{ fontSize: 15, whiteSpace: 'pre-wrap' }}>{e.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const backBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 15,
  cursor: 'pointer',
  padding: 0,
  color: '#555',
};
