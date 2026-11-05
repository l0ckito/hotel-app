import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import GuestLayout from '../../components/GuestLayout';
import { useHotel } from '../../hooks/useHotel';
import { submitRequest, type RequestCategory } from '../../api/requests';

const CATEGORY_CONFIG: Record<string, { emoji: string }> = {
  towel: { emoji: '🧺' },
  maintenance: { emoji: '🔧' },
  food: { emoji: '🍽️' },
  other: { emoji: '💬' },
  call_server: { emoji: '🛎️' },
  need_napkins: { emoji: '🧻' },
  need_utensils: { emoji: '🍴' },
  water_refill: { emoji: '💧' },
  check: { emoji: '💳' },
};

export default function RequestForm({
  room,
  token,
  onBack,
}: {
  room: string | null;
  token: string | null;
  onBack: () => void;
}) {
  const hotel = useHotel()!;
  const { t } = useTranslation();
  const enabledCategories = useMemo(
    () =>
      (hotel.request_categories ?? [])
        .map((key) => ({
          value: key as RequestCategory,
          label: t(`staff.req_${key}`) ?? key,
          emoji: CATEGORY_CONFIG[key]?.emoji ?? '💬',
        }))
        .filter((category) => category.label),
    [hotel.request_categories, t],
  );

  const [category, setCategory] = useState<RequestCategory | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!room || !token) {
    return (
      <GuestLayout>
        <div>
          <button onClick={onBack} style={backBtn}>← {t('guest.back')}</button>
          <h2 style={{ marginTop: 12 }}>{t('guest.qr_required')}</h2>
          <p>{t('guest.qr_required_desc')}</p>
        </div>
      </GuestLayout>
    );
  }

  if (done) {
    return (
      <GuestLayout>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginTop: 40 }}>✅</div>
          <h2 style={{ color: 'var(--primary-color)' }}>{t('guest.request_sent')}</h2>
          <p>{t('guest.table')} {room} — {t('guest.request_sent_desc')}</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            <button onClick={() => { setDone(false); setCategory(null); setNote(''); }} style={btn}>
              {t('guest.send_another')}
            </button>
            <button onClick={onBack} style={{ ...btn, background: '#f5f5f5' }}>
              {t('guest.back_home')}
            </button>
          </div>
        </div>
      </GuestLayout>
    );
  }

  async function handleSubmit() {
    if (!category) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitRequest({
        hotel_id: hotel.id,
        room_number: room!,
        category,
        note: note.trim() || undefined,
        t: token!,
      });
      setDone(true);
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '');
      if (msg.toLowerCase().includes('invalid token')) {
        setError('This QR code is no longer valid. Please ask reception for a new one.');
      } else {
        setError(t('guest.something_wrong'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GuestLayout>
      <div>
        <button onClick={onBack} style={backBtn}>← {t('guest.back')}</button>
        <h2 style={{ color: 'var(--primary-color)', marginTop: 12 }}>{t('guest.request_service')}</h2>
        <p style={{ color: '#666' }}>{t('guest.request_service_desc', { room })}</p>

        <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
          {enabledCategories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              style={{
                ...btn,
                borderColor: category === c.value ? 'var(--primary-color)' : '#eee',
                background: category === c.value ? '#fffaf2' : 'white',
              }}
            >
              <span style={{ marginRight: 10 }}>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>

        <textarea
          placeholder={t('guest.request_note_placeholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{
            width: '100%',
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            border: '1px solid #eee',
            fontFamily: 'inherit',
            fontSize: 15,
            minHeight: 90,
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ color: '#b91c1c', marginTop: 12, background: '#fef2f2', padding: 12, borderRadius: 8 }}>
            {error}
          </p>
        )}

        <button
          disabled={!category || submitting || enabledCategories.length === 0}
          onClick={handleSubmit}
          style={{
            ...btn,
            marginTop: 20,
            width: '100%',
            background: category ? 'var(--primary-color)' : '#ccc',
            color: 'white',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          {submitting ? t('guest.sending') : t('guest.send_request')}
        </button>
      </div>
    </GuestLayout>
  );
}

const btn: React.CSSProperties = {
  padding: '16px 18px',
  fontSize: 16,
  borderRadius: 12,
  border: '1px solid #eee',
  background: 'white',
  textAlign: 'left',
  cursor: 'pointer',
};

const backBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 15,
  cursor: 'pointer',
  padding: 0,
  color: '#555',
};
