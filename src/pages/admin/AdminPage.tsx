import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  isAdmin, listHotels, createHotel, generateRoomToken, type Hotel,
} from '../../api/admin';
import { signIn, signOut } from '../../api/staff';

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await import('../../lib/supabase').then((m) => m.supabase.auth.getUser());
      if (!data.user) { setAuthed(false); return; }
      setAuthed(await isAdmin());
    })();
  }, []);

  if (authed === null) return <div style={{ padding: 40 }}>Checking…</div>;
  if (!authed) return <AdminLogin onSignedIn={() => window.location.reload()} />;
  return <AdminHome />;
}

function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try { await signIn(email, password); onSignedIn(); }
    catch (e: any) { setError(e.message); }
  }
  return (
    <form onSubmit={submit} style={{ maxWidth: 380, margin: '80px auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1>Platform admin</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button style={btn}>Sign in</button>
    </form>
  );
}

function AdminHome() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selected, setSelected] = useState<Hotel | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { listHotels().then(setHotels); }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Platform admin</h1>
        <button style={smallBtn} onClick={() => signOut().then(() => window.location.reload())}>Sign out</button>
      </div>

      <h2 style={{ marginTop: 32 }}>Hotels ({hotels.length})</h2>
      <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
        {hotels.map((h) => (
          <div key={h.id} style={row}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{h.name}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{h.subdomain}</div>
            </div>
            <button style={smallBtn} onClick={() => setSelected(h)}>Generate QR</button>
          </div>
        ))}
      </div>

      <button style={btn} onClick={() => setCreating((v) => !v)}>
        {creating ? 'Cancel' : '+ Add hotel'}
      </button>
      {creating && <NewHotelForm onCreated={(h) => { setHotels((prev) => [...prev, h]); setCreating(false); }} />}

      {selected && <QrPanel hotel={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function NewHotelForm({ onCreated }: { onCreated: (h: Hotel) => void }) {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [color, setColor] = useState('#0f4c81');
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const h = await createHotel({ name, subdomain: subdomain.toLowerCase().trim(), primary_color: color });
      onCreated(h);
    } catch (e: any) { setError(e.message); }
  }
  return (
    <form onSubmit={submit} style={{ marginTop: 16, padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
      <input style={input} placeholder="Hotel name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input style={input} placeholder="subdomain (e.g. grandplaza)" value={subdomain} onChange={(e) => setSubdomain(e.target.value)} required />
      <input style={input} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button style={btn}>Create</button>
    </form>
  );
}

function QrPanel({ hotel, onClose }: { hotel: Hotel; onClose: () => void }) {
  const [rooms, setRooms] = useState('101\n102\n103');
  const [room, setRoom] = useState('101');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null); setToken(null);
    try {
      const r = await generateRoomToken(hotel.id, room.trim());
      setToken(r.t);
    } catch (e: any) { setError(e.message); }
  }

  const base = `${window.location.origin}/?hotel=${hotel.subdomain}&room=${room}&t=${token ?? ''}`;

  return (
    <div style={{ marginTop: 32, padding: 20, border: '1px solid #eee', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>QR for {hotel.name}</h2>
        <button style={smallBtn} onClick={onClose}>Close</button>
      </div>

      <p style={{ color: '#666', fontSize: 13 }}>
        Room numbers (one per line) — generate for the room you want to print.
      </p>
      <textarea
        style={{ ...input, height: 80, fontFamily: 'monospace' }}
        value={rooms}
        onChange={(e) => setRooms(e.target.value)}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input style={{ ...input, flex: 1, marginBottom: 0 }} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room to generate" />
        <button style={btn} onClick={generate}>Generate</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {token && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <QRCodeCanvas value={base} size={220} />
          <p style={{ fontSize: 12, color: '#666', wordBreak: 'break-all' }}>{base}</p>
          <p style={{ fontSize: 12, color: '#999' }}>
            Print this and stick it in room {room}. Note: URL points to{' '}
            <code>{window.location.origin}</code> — in production this will be your domain.
          </p>
        </div>
      )}
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%', padding: 12, marginBottom: 12, border: '1px solid #ddd',
  borderRadius: 8, fontSize: 15, boxSizing: 'border-box',
};
const btn: React.CSSProperties = {
  padding: '12px 18px', fontSize: 15, fontWeight: 600, background: '#111',
  color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
};
const smallBtn: React.CSSProperties = {
  padding: '8px 14px', fontSize: 13, background: 'white', border: '1px solid #ddd',
  borderRadius: 8, cursor: 'pointer',
};
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
  border: '1px solid #eee', borderRadius: 10,
};
