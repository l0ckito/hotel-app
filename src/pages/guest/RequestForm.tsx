import { useState } from 'react';
import { useHotel } from '../../components/BrandProvider';
import { submitRequest, type RequestCategory } from '../../api/requests';

const CATEGORIES: { value: RequestCategory; label: string; emoji: string }[] = [
  { value: 'towel', label: 'Towels / Amenities', emoji: '🧺' },
{ value: 'maintenance', label: 'Maintenance', emoji: '🔧' },
{ value: 'food', label: 'Food & Drink', emoji: '🍽️' },
{ value: 'other', label: 'Something else', emoji: '💬' },
];

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
  const [category, setCategory] = useState<RequestCategory | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!room || !token) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto' }}>
      <button onClick={onBack} style={backBtn}>← Back</button>
      <h2>Room QR required</h2>
      <p>Please scan the QR code in your room to make a request.</p>
      </div>
    );
  }
  
  if (done) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginTop: 40 }}>✅</div>
      <h2 style={{ color: 'var(--primary-color)' }}>Request sent</h2>
      <p>Room {room} — our team has been notified.</p>
      <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
      <button
      onClick={() => { setDone(false); setCategory(null); setNote(''); }}
      style={btn}
      >
      Send another request
      </button>
      <button onClick={onBack} style={{ ...btn, background: '#f5f5f5' }}>
      Back to home
      </button>
      </div>
      </div>
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
        setError('This QR code is out of date. Please ask the front desk for a new one.');
      } else {
        setError('Something went wrong. Please try again or call the front desk.');
      }
    } finally {
      setSubmitting(false);
    }
  }
  
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto' }}>
    <button onClick={onBack} style={backBtn}>← Back</button>
    <h2 style={{ color: 'var(--primary-color)' }}>New request</h2>
    <p style={{ color: '#666' }}>Room {room}</p>
    
    <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
    {CATEGORIES.map((c) => (
      <button
      key={c.value}
      onClick={() => setCategory(c.value)}
      style={{
        ...btn,
        borderColor: category === c.value ? 'var(--primary-color)' : '#eee',
                            background: category === c.value ? '#f5f8fc' : 'white',
      }}
      >
      <span style={{ marginRight: 10 }}>{c.emoji}</span>
      {c.label}
      </button>
    ))}
    </div>
    
    <textarea
    placeholder="Anything we should know? (optional)"
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
    disabled={!category || submitting}
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
    {submitting ? 'Sending…' : 'Send request'}
    </button>
    </div>
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
