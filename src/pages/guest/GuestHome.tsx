import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import GuestLayout from '../../components/GuestLayout';
import { useHotel } from '../../hooks/useHotel';
import RequestForm from './RequestForm';
import MenuPage from './MenuPage';
import RecommendationsPage from './RecommendationsPage';
import CompendiumPage from './CompendiumPage';

type View = 'home' | 'menu' | 'request' | 'explore' | 'info';

export default function GuestHome({ room, token }: { room: string | null; token: string | null }) {
  const hotel = useHotel();
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<View>('home');

  if (!hotel) {
    return <div style={{ padding: 24, fontFamily: 'system-ui' }}>{t('guest.loading_hotel')}</div>;
  }

  if (view === 'menu') return <MenuPage room={room} token={token} onBack={() => setView('home')} />;
  if (view === 'request') return <RequestForm room={room} token={token} onBack={() => setView('home')} />;
  if (view === 'explore') return <RecommendationsPage onBack={() => setView('home')} />;
  if (view === 'info') return <CompendiumPage onBack={() => setView('home')} />;

  const showWifi = hotel.feature_wifi_info !== false;
  const showRequest = hotel.feature_make_request !== false;
  const showOrder = hotel.feature_order_food !== false;
  const showExplore = hotel.feature_explore_local === true;
  const requestCategories = Array.isArray(hotel.request_categories) ? hotel.request_categories : [];

  const enabledButtons = [
    showWifi && { key: 'wifi', label: t('guest.wifi_info'), icon: 'ℹ️', view: 'info' as View },
    showRequest && { key: 'request', label: t('guest.make_request'), icon: '🛎️', view: 'request' as View },
    showExplore && { key: 'explore', label: t('guest.explore_local'), icon: '🏞', view: 'explore' as View },
    showOrder && { key: 'menu', label: t('guest.order_food'), icon: '🍔', view: 'menu' as View },
  ].filter(Boolean) as Array<{ key: string; label: string; icon: string; view: View }>;

  return (
    <GuestLayout>
      <div data-locale={i18n.language}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <LanguageSwitcher style={{ minWidth: 88 }} />
        </div>

        {room && <p style={{ color: '#666', margin: '0 0 8px' }}>{t('guest.table')} {room}</p>}
        <p style={{ margin: '0 0 8px' }}>{t('guest.welcome')}</p>

        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {enabledButtons.map(({ key, label, icon, view: btnView }) => (
            <button key={key} style={btn} onClick={() => setView(btnView)}>
              {icon} {label}
            </button>
          ))}
        </div>

        {requestCategories.length === 0 && !token && (
          <p style={{ marginTop: 24, fontSize: 13, color: '#999' }}>
            {t('guest.scan_qr')}
          </p>
        )}
      </div>
    </GuestLayout>
  );
}

const btn: React.CSSProperties = {
  padding: '18px 20px', fontSize: 16, borderRadius: 12,
  border: '1px solid #eee', background: 'white',
  textAlign: 'left', cursor: 'pointer',
};
