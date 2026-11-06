import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import {
  isAdmin,
  listHotels,
  createHotel,
  generateRoomToken,
  inviteManager,
  getPlatformStats,
  updateHotel,
  deleteHotel,
  type Hotel,
  type TenantType,
} from '../../api/admin';
import { updateHotelBranding, uploadRestaurantAsset } from '../../api/hotels';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { supabase } from '../../lib/supabase';
import { signIn, signOut } from '../../api/staff';

const ALL_REQUEST_CATEGORIES = [
  'call_server',
  'need_napkins',
  'need_utensils',
  'water_refill',
  'check',
  'towel',
  'maintenance',
  'food',
  'other',
] as const;

const DEFAULT_FEATURES: Record<TenantType, { feature_order_food: boolean; feature_wifi_info: boolean; feature_make_request: boolean; feature_explore_local: boolean }> = {
  restaurant: {
    feature_order_food: true,
    feature_wifi_info: true,
    feature_make_request: true,
    feature_explore_local: false,
  },
  hotel: {
    feature_order_food: false,
    feature_wifi_info: true,
    feature_make_request: true,
    feature_explore_local: true,
  },
  both: {
    feature_order_food: true,
    feature_wifi_info: true,
    feature_make_request: true,
    feature_explore_local: true,
  },
};

const DEFAULT_CATEGORIES: Record<TenantType, string[]> = {
  restaurant: ['call_server', 'need_napkins', 'need_utensils', 'water_refill', 'check'],
  hotel: ['towel', 'maintenance', 'food', 'other'],
  both: ALL_REQUEST_CATEGORIES as unknown as string[],
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

type HotelFormValues = {
  name: string;
  subdomain: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  background_url: string;
  tenant_type: TenantType;
  feature_order_food: boolean;
  feature_wifi_info: boolean;
  feature_make_request: boolean;
  feature_explore_local: boolean;
  request_categories: string[];
};

function buildHotelFormValues(hotel?: Partial<Hotel> | null): HotelFormValues {
  const tenantType = hotel?.tenant_type ?? 'restaurant';
  const defaults = DEFAULT_FEATURES[tenantType];
  const categories = hotel?.request_categories?.length ? hotel.request_categories : DEFAULT_CATEGORIES[tenantType];

  return {
    name: hotel?.name ?? 'Casa Magnolia',
    subdomain: hotel?.subdomain ?? 'casamagnolia',
    primary_color: hotel?.primary_color ?? '#800000',
    secondary_color: hotel?.secondary_color ?? '#d97706',
    logo_url: hotel?.logo_url ?? '',
    background_url: hotel?.background_url ?? '',
    tenant_type: tenantType,
    feature_order_food: hotel ? Boolean(hotel.feature_order_food) : defaults.feature_order_food,
    feature_wifi_info: hotel ? Boolean(hotel.feature_wifi_info) : defaults.feature_wifi_info,
    feature_make_request: hotel ? Boolean(hotel.feature_make_request) : defaults.feature_make_request,
    feature_explore_local: hotel ? Boolean(hotel.feature_explore_local) : defaults.feature_explore_local,
    request_categories: categories,
  };
}

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setAuthed(false); return; }
      setAuthed(await isAdmin());
    })();
  }, []);

  if (authed === null) return <div data-locale={i18n.language} style={{ padding: 40 }}>{t('admin.checking')}</div>;
  if (!authed) return <AdminLogin onSignedIn={() => window.location.reload()} />;
  return <AdminHome />;
}

function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const { t, i18n } = useTranslation();
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
    <div data-locale={i18n.language} style={{ position: 'relative', maxWidth: 380, margin: '80px auto', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ position: 'absolute', top: 0, right: 0 }}>
        <LanguageSwitcher />
      </div>
      <form onSubmit={submit} style={{ maxWidth: 380, margin: '0 auto' }}>
        <h1>{t('admin.login_title')}</h1>
        <input type="email" placeholder={t('admin.email')} value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
        <input type="password" placeholder={t('admin.password')} value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button style={btn}>{t('admin.sign_in')}</button>
      </form>
    </div>
  );
}

function AdminHome() {
  const { t, i18n } = useTranslation();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selected, setSelected] = useState<Hotel | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [stats, setStats] = useState({ totalHotels: 0, totalRequests: 0 });

  async function refreshData() {
    const [nextHotels, nextStats] = await Promise.all([listHotels(), getPlatformStats()]);
    setHotels(nextHotels);
    setStats(nextStats);
  }

  useEffect(() => { refreshData(); }, []);

  async function handleDeleteHotel(hotel: Hotel) {
    const confirmed = window.confirm(`¿Seguro que quieres eliminar ${hotel.name}? Esto borrará el restaurante y todos sus datos.`);
    if (!confirmed) return;

    try {
      await deleteHotel(hotel.id);
      setHotels((prev) => prev.filter((item) => item.id !== hotel.id));
      if (selected?.id === hotel.id) setSelected(null);
      if (editingHotel?.id === hotel.id) setEditingHotel(null);
      await refreshData();
    } catch (e: any) {
      alert(`No se pudo eliminar el restaurante: ${e.message}`);
    }
  }

  return (
    <div data-locale={i18n.language} style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>{t('admin.dashboard_title')}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LanguageSwitcher />
          <button style={smallBtn} onClick={() => signOut().then(() => window.location.reload())}>{t('admin.sign_out')}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        <div style={{ flex: 1, padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{t('admin.total_hotels')}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>{stats.totalHotels}</div>
        </div>
        <div style={{ flex: 1, padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{t('admin.total_requests')}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>{stats.totalRequests}</div>
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>{t('admin.hotels_list')} ({hotels.length})</h2>
      <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
        {hotels.map((h) => (
          <div key={h.id} style={row}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{h.name}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{h.subdomain}</div>
            </div>
            <button
              style={{ ...smallBtn, marginRight: 8 }}
              onClick={() => {
                const email = prompt(`Correo electrónico del personal de ${h.name}:`);
                if (!email) return;
                const name = prompt('Nombre completo:') || 'Personal';
                const password = prompt('Contraseña temporal (mínimo 6 caracteres):');
                if (password === null || password.length < 6) {
                  alert('La contraseña debe tener al menos 6 caracteres.');
                  return;
                }
                inviteManager(email, h.id, name, password)
                  .then(() => alert(`¡Cuenta creada! Pídele que inicie sesión con ${email} y la contraseña que asignaste.`))
                  .catch((e) => alert(`Error: ${e.message}`));
              }}
            >
              {t('admin.invite_manager')}
            </button>
            <button style={{ ...smallBtn, marginRight: 8 }} onClick={() => setSelected(h)}>{t('admin.generate_qr')}</button>
            <button style={{ ...smallBtn, marginRight: 8 }} onClick={() => setEditingHotel(h)}>{t('admin.edit_hotel')}</button>
            <button style={smallBtn} onClick={() => handleDeleteHotel(h)}>{t('admin.delete_hotel')}</button>
          </div>
        ))}
      </div>

      {editingHotel && (
        <EditHotelForm
          hotel={editingHotel}
          onSaved={(updated) => {
            setHotels((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            setEditingHotel(null);
            refreshData();
          }}
          onCancel={() => setEditingHotel(null)}
          t={t}
        />
      )}

      <button style={btn} onClick={() => setCreating((v) => !v)}>{creating ? t('admin.cancel') : t('admin.add_hotel')}</button>
      {creating && <NewHotelForm onCreated={(h) => { setHotels((prev) => [...prev, h]); setCreating(false); refreshData(); }} t={t} />}

      {selected && <QrPanel hotel={selected} onClose={() => setSelected(null)} t={t} />}
    </div>
  );
}

function EditHotelForm({ hotel, onSaved, onCancel, t }: { hotel: Hotel; onSaved: (h: Hotel) => void; onCancel: () => void; t: (key: string) => string }) {
  const [form, setForm] = useState<HotelFormValues>(buildHotelFormValues(hotel));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleCategory(category: string) {
    setForm((prev) => {
      const hasCategory = prev.request_categories.includes(category);
      const next = hasCategory
        ? prev.request_categories.filter((item) => item !== category)
        : [...prev.request_categories, category];
      return { ...prev, request_categories: next };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const cleanSubdomain = slugify(form.subdomain);
      if (cleanSubdomain.length < 2) {
        setError('Subdomain must contain letters or numbers');
        return;
      }

      const payload = {
        name: form.name.trim(),
        subdomain: cleanSubdomain,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color || null,
        tenant_type: form.tenant_type,
        feature_order_food: form.feature_order_food,
        feature_wifi_info: form.feature_wifi_info,
        feature_make_request: form.feature_make_request,
        feature_explore_local: form.feature_explore_local,
        request_categories: form.request_categories,
      };

      const updated = await updateHotel(hotel.id, payload);

      if (logoFile) {
        const logoUrl = await uploadRestaurantAsset(hotel.id, 'logo', logoFile);
        await updateHotel(hotel.id, { logo_url: logoUrl });
      }
      if (backgroundFile) {
        const backgroundUrl = await uploadRestaurantAsset(hotel.id, 'background', backgroundFile);
        await updateHotel(hotel.id, { background_url: backgroundUrl });
      }

      onSaved({ ...updated, ...payload, logo_url: form.logo_url || updated.logo_url || null } as Hotel);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16, padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>{t('admin.edit_hotel')}</h3>
      <input style={input} placeholder={t('admin.hotel_name')} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
      <input
        style={input}
        placeholder={t('admin.subdomain')}
        value={form.subdomain}
        onChange={(e) => setForm((prev) => ({ ...prev, subdomain: slugify(e.target.value) }))}
        required
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ ...label, marginBottom: 0 }}>
          <span style={{ display: 'block', marginBottom: 8 }}>{t('admin.tenant_type')}</span>
          <select
            style={{ ...input, marginBottom: 0 }}
            value={form.tenant_type}
            onChange={(e) => {
              const nextType = e.target.value as TenantType;
              setForm((prev) => ({
                ...prev,
                tenant_type: nextType,
                ...DEFAULT_FEATURES[nextType],
                request_categories: DEFAULT_CATEGORIES[nextType],
              }));
            }}
          >
            <option value="restaurant">{t('admin.type_restaurant')}</option>
            <option value="hotel">{t('admin.type_hotel')}</option>
            <option value="both">{t('admin.type_both')}</option>
          </select>
        </label>
        <label style={{ ...label, marginBottom: 0 }}>
          <span style={{ display: 'block', marginBottom: 8 }}>Color principal</span>
          <input style={{ ...input, marginBottom: 0 }} type="color" value={form.primary_color} onChange={(e) => setForm((prev) => ({ ...prev, primary_color: e.target.value }))} />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ ...label, marginBottom: 8 }}>{t('admin.features')}</div>
        {[
          ['feature_order_food', t('admin.feature_order_food')],
          ['feature_wifi_info', t('admin.feature_wifi_info')],
          ['feature_make_request', t('admin.feature_make_request')],
          ['feature_explore_local', t('admin.feature_explore_local')],
        ].map(([key, labelText]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={Boolean(form[key as keyof HotelFormValues])}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
            <span>{labelText}</span>
          </label>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ ...label, marginBottom: 8 }}>{t('admin.request_categories')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {ALL_REQUEST_CATEGORIES.map((cat) => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.request_categories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />
              <span>{cat}</span>
            </label>
          ))}
        </div>
      </div>

      <label style={{ ...label, display: 'block', marginTop: 12 }}>
        Logo (opcional)
        <input style={{ ...input, marginTop: 8 }} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
      </label>
      <label style={{ ...label, display: 'block' }}>
        Fondo del portal (opcional)
        <input style={{ ...input, marginTop: 8 }} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => setBackgroundFile(e.target.files?.[0] ?? null)} />
      </label>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btn} type="submit">{t('admin.save')}</button>
        <button style={secondaryBtn} type="button" onClick={onCancel}>{t('admin.cancel')}</button>
      </div>
    </form>
  );
}

function NewHotelForm({ onCreated, t }: { onCreated: (h: Hotel) => void; t: (key: string) => string }) {
  const [form, setForm] = useState<HotelFormValues>(buildHotelFormValues());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleCategory(category: string) {
    setForm((prev) => {
      const hasCategory = prev.request_categories.includes(category);
      const next = hasCategory
        ? prev.request_categories.filter((item) => item !== category)
        : [...prev.request_categories, category];
      return { ...prev, request_categories: next };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const cleanSubdomain = slugify(form.subdomain);
      if (cleanSubdomain.length < 2) {
        setError('Subdomain must contain letters or numbers');
        return;
      }

      const created = await createHotel({
        name: form.name.trim(),
        subdomain: cleanSubdomain,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color || null,
        tenant_type: form.tenant_type,
        feature_order_food: form.feature_order_food,
        feature_wifi_info: form.feature_wifi_info,
        feature_make_request: form.feature_make_request,
        feature_explore_local: form.feature_explore_local,
        request_categories: form.request_categories,
      });

      let logoUrl: string | null = created.logo_url ?? null;
      let backgroundUrl: string | null = created.background_url ?? null;

      if (logoFile) logoUrl = await uploadRestaurantAsset(created.id, 'logo', logoFile);
      if (backgroundFile) backgroundUrl = await uploadRestaurantAsset(created.id, 'background', backgroundFile);

      const updated = await updateHotelBranding(created.id, {
        logo_url: logoUrl,
        background_url: backgroundUrl,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color || null,
      });

      onCreated(updated as Hotel);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16, padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
      <input style={input} placeholder={t('admin.hotel_name')} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
      <input
        style={input}
        placeholder={t('admin.subdomain')}
        value={form.subdomain}
        onChange={(e) => setForm((prev) => ({ ...prev, subdomain: slugify(e.target.value) }))}
        required
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ ...label, marginBottom: 0 }}>
          <span style={{ display: 'block', marginBottom: 8 }}>{t('admin.tenant_type')}</span>
          <select
            style={{ ...input, marginBottom: 0 }}
            value={form.tenant_type}
            onChange={(e) => {
              const nextType = e.target.value as TenantType;
              setForm((prev) => ({
                ...prev,
                tenant_type: nextType,
                ...DEFAULT_FEATURES[nextType],
                request_categories: DEFAULT_CATEGORIES[nextType],
              }));
            }}
          >
            <option value="restaurant">{t('admin.type_restaurant')}</option>
            <option value="hotel">{t('admin.type_hotel')}</option>
            <option value="both">{t('admin.type_both')}</option>
          </select>
        </label>
        <label style={{ ...label, marginBottom: 0 }}>
          <span style={{ display: 'block', marginBottom: 8 }}>Color principal</span>
          <input style={{ ...input, marginBottom: 0 }} type="color" value={form.primary_color} onChange={(e) => setForm((prev) => ({ ...prev, primary_color: e.target.value }))} />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ ...label, marginBottom: 8 }}>{t('admin.features')}</div>
        {[
          ['feature_order_food', t('admin.feature_order_food')],
          ['feature_wifi_info', t('admin.feature_wifi_info')],
          ['feature_make_request', t('admin.feature_make_request')],
          ['feature_explore_local', t('admin.feature_explore_local')],
        ].map(([key, labelText]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={Boolean(form[key as keyof HotelFormValues])}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
            <span>{labelText}</span>
          </label>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ ...label, marginBottom: 8 }}>{t('admin.request_categories')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {ALL_REQUEST_CATEGORIES.map((cat) => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.request_categories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />
              <span>{cat}</span>
            </label>
          ))}
        </div>
      </div>

      <label style={{ ...label, display: 'block', marginTop: 12 }}>
        Logo (opcional)
        <input style={{ ...input, marginTop: 8 }} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
      </label>
      <label style={{ ...label, display: 'block' }}>
        Fondo del portal (opcional)
        <input style={{ ...input, marginTop: 8 }} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => setBackgroundFile(e.target.files?.[0] ?? null)} />
      </label>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button style={btn}>{t('admin.create')}</button>
    </form>
  );
}

function QrPanel({ hotel, onClose, t }: { hotel: Hotel; onClose: () => void; t: (key: string) => string }) {
  const [rooms, setRooms] = useState('Table 1\nTable 2\nTable 3');
  const [room, setRoom] = useState('Table 1');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null); setToken(null);
    try {
      const r = await generateRoomToken(hotel.id, room.trim());
      setToken(r.t);
    } catch (e: any) { setError(e.message); }
  }

  const base = `${window.location.origin}/?hotel=${encodeURIComponent(hotel.subdomain)}&room=${encodeURIComponent(room)}&t=${encodeURIComponent(token ?? '')}`;

  return (
    <div style={{ marginTop: 32, padding: 20, border: '1px solid #eee', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>QR para {hotel.name}</h2>
        <button style={smallBtn} onClick={onClose}>{t('admin.cancel')}</button>
      </div>

      <p style={{ color: '#666', fontSize: 13 }}>Mesas (una por línea) — genera el QR de la mesa que quieres imprimir.</p>
      <textarea style={{ ...input, height: 80, fontFamily: 'monospace' }} value={rooms} onChange={(e) => setRooms(e.target.value)} />

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input style={{ ...input, flex: 1, marginBottom: 0 }} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Mesa a generar" />
        <button style={btn} onClick={generate}>{t('admin.generate_qr')}</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {token && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <QRCodeCanvas value={base} size={220} />
          <p style={{ fontSize: 12, color: '#666', wordBreak: 'break-all' }}>{base}</p>
          <p style={{ fontSize: 12, color: '#999' }}>Imprime esto y pégalo en la mesa {room}. La URL apunta a <code>{window.location.origin}</code>.</p>
        </div>
      )}
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%', padding: 12, marginBottom: 12, border: '1px solid #ddd',
  borderRadius: 8, fontSize: 15, boxSizing: 'border-box',
};
const label: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#555',
};
const btn: React.CSSProperties = {
  padding: '12px 18px', fontSize: 15, fontWeight: 600, background: '#800000',
  color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  padding: '12px 18px', fontSize: 15, fontWeight: 600, background: '#fff',
  color: '#0f172a', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer',
};
const smallBtn: React.CSSProperties = {
  padding: '8px 14px', fontSize: 13, background: 'white', border: '1px solid #ddd',
  borderRadius: 8, cursor: 'pointer',
};
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
  border: '1px solid #eee', borderRadius: 10,
};
