import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import GuestLayout from '../../components/GuestLayout';
import { useHotel } from '../../hooks/useHotel';
import { getRecommendations, type Recommendation } from '../../api/recommendations';

const CAT_LABEL: Record<Recommendation['category'], string> = {
  food: '🍽 Food',
  drink: '🍷 Drinks',
  activity: '🏞 Activity',
  shopping: '🛍 Shopping',
  other: '📍 Other',
};

export default function RecommendationsPage({ onBack }: { onBack: () => void }) {
  const hotel = useHotel()!;
  const { t } = useTranslation();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecommendations(hotel.id)
      .then(setRecs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [hotel.id]);

  return (
    <GuestLayout>
      <div>
        <button onClick={onBack} style={backBtn}>← {t('guest.back')}</button>
        <h2 style={{ color: 'var(--primary-color)', marginTop: 12 }}>{t('guest.explore_title')}</h2>
        <p style={{ color: '#666', marginTop: 0 }}>{t('guest.explore_desc')} {hotel.name}</p>

        {loading && <p>{t('guest.loading')}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && !error && recs.length === 0 && (
          <p style={{ color: '#999' }}>{t('guest.no_recommendations')}</p>
        )}

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {recs.map((r) => (
            <div key={r.id} style={card}>
              <div style={{ fontSize: 12, color: 'var(--primary-color)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {CAT_LABEL[r.category]}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>{r.name}</div>
              {r.description && (
                <div style={{ color: '#444', marginTop: 4, whiteSpace: 'pre-wrap' }}>{r.description}</div>
              )}
              {r.walk_minutes != null && (
                <div style={{ color: '#999', fontSize: 13, marginTop: 8 }}>🚶 {r.walk_minutes} min walk</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </GuestLayout>
  );
}

const card: React.CSSProperties = {
  padding: 16, borderRadius: 12, border: '1px solid #eee', background: 'white',
};
const backBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', fontSize: 15, cursor: 'pointer',
  padding: 0, color: '#555',
};
