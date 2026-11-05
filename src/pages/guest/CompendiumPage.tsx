import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import GuestLayout from '../../components/GuestLayout';
import { useHotel } from '../../hooks/useHotel';
import { getCompendium, type CompendiumEntry } from '../../api/compendium';

export default function CompendiumPage({ onBack }: { onBack: () => void }) {
  const hotel = useHotel()!;
  const { t } = useTranslation();
  const [entries, setEntries] = useState<CompendiumEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompendium(hotel.id)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [hotel.id]);

  return (
    <GuestLayout>
      <div>
        <button onClick={onBack} style={backBtn}>← {t('guest.back')}</button>
        <h2 style={{ color: 'var(--primary-color)', marginTop: 12 }}>{t('guest.info_title')}</h2>

        {loading && <p>{t('guest.loading')}</p>}
        {!loading && entries.length === 0 && <p>{t('guest.no_info')}</p>}

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
    </GuestLayout>
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
