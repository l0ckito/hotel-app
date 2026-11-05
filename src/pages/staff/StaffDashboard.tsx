import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { getMe, signOut, type StaffMe } from '../../api/staff';
import { listRequests, updateRequestStatus } from '../../api/requests';
import { updateOrderStatus } from '../../api/orders';
import MenuEditor from './MenuEditor';
import CompendiumEditor from './CompendiumEditor';
import RecommendationsEditor from './RecommendationsEditor';
import BrandEditor from './BrandEditor';
import { BrandProvider } from '../../components/BrandProvider';
import GuestHome from '../guest/GuestHome';
import CompendiumPage from '../guest/CompendiumPage';
import RequestForm from '../guest/RequestForm';
import { HotelContext } from '../../hooks/useHotel';

type Req = {
  id: string;
  room_number: string;
  category: string;
  note: string | null;
  status: 'new' | 'in_progress' | 'done';
  created_at: string;
};

type OrderItem = {
  quantity: number;
  price_at_time: number;
  menu_items: { name: string } | { name: string }[] | null;
};

type FullOrder = {
  id: string;
  room_number: string;
  status: 'new' | 'in_progress' | 'ready' | 'paid' | 'completed';
  total_price: number;
  created_at: string;
  order_items: OrderItem[];
};

export default function StaffDashboard() {
  const { t, i18n } = useTranslation();
  const [me, setMe] = useState<StaffMe | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);
  const [orders, setOrders] = useState<FullOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'staff' | 'guest-home' | 'guest-wifi' | 'guest-services'>('staff');

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const staff = await getMe();
      if (!isMounted) return;
      if (!staff) {
        setLoading(false);
        return;
      }

      setMe(staff);
      const initialRequests = await listRequests(staff.hotel_id);
      setRequests(initialRequests as Req[]);

      const { data: fullOrders } = await supabase
        .from('orders')
        .select(`
          id,
          room_number,
          status,
          total_price,
          created_at,
          order_items (
            quantity,
            price_at_time,
            menu_items ( name )
          )
        `)
        .eq('hotel_id', staff.hotel_id)
        .order('created_at', { ascending: false });

      if (isMounted) {
        setOrders((fullOrders as FullOrder[]) ?? []);
        setLoading(false);
      }

      channel = supabase
        .channel(`restaurant-${staff.hotel_id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'requests', filter: `hotel_id=eq.${staff.hotel_id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') setRequests((prev) => [payload.new as Req, ...prev]);
            if (payload.eventType === 'UPDATE')
              setRequests((prev) => prev.map((r) => (r.id === (payload.new as Req).id ? (payload.new as Req) : r)));
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders', filter: `hotel_id=eq.${staff.hotel_id}` },
          async (payload) => {
            const { data } = await supabase
              .from('orders')
              .select(`
                id,
                room_number,
                status,
                total_price,
                created_at,
                order_items (
                  quantity,
                  price_at_time,
                  menu_items ( name )
                )
              `)
              .eq('id', payload.new.id)
              .single();
            if (data) setOrders((prev) => [data as FullOrder, ...prev]);
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `hotel_id=eq.${staff.hotel_id}` },
          async (payload) => {
            const { data } = await supabase
              .from('orders')
              .select(`
                id,
                room_number,
                status,
                total_price,
                created_at,
                order_items (
                  quantity,
                  price_at_time,
                  menu_items ( name )
                )
              `)
              .eq('id', payload.new.id)
              .single();
            if (data) {
              setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? (data as FullOrder) : o)));
            }
          },
        )
        .subscribe();
    })();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function toggleRequestStatus(r: Req) {
    try {
      const next = r.status === 'new' ? 'in_progress' : 'done';
      await updateRequestStatus(r.id, next);
    } catch (err: any) {
      alert('Error updating request: ' + err.message);
    }
  }

  async function advanceOrder(order: FullOrder) {
    try {
      let next: FullOrder['status'] = 'ready';
      if (order.status === 'new') next = 'in_progress';
      else if (order.status === 'in_progress') next = 'ready';
      else if (order.status === 'ready') next = 'paid';

      await updateOrderStatus(order.id, next);
    } catch (err: any) {
      alert('Error updating order: ' + err.message);
    }
  }

  async function markPaid(order: FullOrder) {
    try {
      await updateOrderStatus(order.id, 'completed');
    } catch (err: any) {
      alert('Error updating order: ' + err.message);
    }
  }

  const hotel = me?.hotel ?? null;
  const hotelContextValue = hotel
    ? { ...hotel, subdomain: hotel.subdomain || hotel.name.toLowerCase().replace(/\s+/g, '-') }
    : null;

  const brandStyles = useMemo(
    () => ({
      '--brand-primary': hotel?.primary_color ?? '#800000',
      '--brand-secondary': hotel?.secondary_color ?? '#d97706',
      '--brand-foreground': '#0f172a',
      '--brand-surface': 'rgba(255, 255, 255, 0.97)',
      '--brand-surface-strong': 'rgba(255, 255, 255, 0.99)',
    } as CSSProperties),
    [hotel],
  );

  const tabAccentStyle = { '--c': hotel?.primary_color ?? '#800000' } as React.CSSProperties;
  const neonTabsCss = useMemo(() => `
    .tt22n { display: flex; gap: 10px; flex-wrap: wrap; min-width: 0; margin-top: 24px; }
    .tt22n input { position: absolute; opacity: 0; pointer-events: none; }
    .tt22b {
      flex: 1; min-width: 0; padding: 12px; border: 1px solid #ddd; border-radius: 6px;
      background: white; font: 700 12px/1 system-ui, sans-serif; letter-spacing: 0.1em;
      text-transform: uppercase; color: #666; cursor: pointer; text-align: center;
      transition: all 0.25s ease; white-space: nowrap;
    }
    .tt22b:hover { color: #333; border-color: #aaa; }

    .tt22n input:checked + .tt22b {
      color: var(--c);
      border-color: var(--c);
      background: color-mix(in srgb, var(--c) 10%, white);
      box-shadow: 0 0 12px color-mix(in srgb, var(--c) 30%, transparent), inset 0 0 8px color-mix(in srgb, var(--c) 15%, transparent);
    }

    .tt22p { display: none; }

    .tt22:has(#tt22-r1:checked) .tt22p:nth-of-type(1),
    .tt22:has(#tt22-r2:checked) .tt22p:nth-of-type(2),
    .tt22:has(#tt22-r3:checked) .tt22p:nth-of-type(3),
    .tt22:has(#tt22-r4:checked) .tt22p:nth-of-type(4),
    .tt22:has(#tt22-r5:checked) .tt22p:nth-of-type(5) {
      display: block;
      padding-top: 18px;
      animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `, []);

  if (loading) return <div style={{ padding: 40 }}>{t('staff.loading')}</div>;
  if (!me) return <div style={{ padding: 40 }}>{t('staff.not_logged_in')}</div>;

  const openRequests = requests.filter((r) => r.status !== 'done');
  const activeOrders = orders.filter((o) => ['new', 'in_progress', 'ready'].includes(o.status));
  const paidOrders = orders.filter((o) => o.status === 'paid');
  const completedOrders = orders.filter((o) => o.status === 'completed');

  const requestLabel = (category: string) => getRequestLabel(category, t);
  const statusText = (status: string) => getStatusText(status, t);

  if (view !== 'staff' && hotel) {
    return (
      <BrandProvider hotel={hotel}>
        <div style={{ minHeight: '100vh', padding: 24, background: '#f8fafc' }}>
          <button
            type="button"
            onClick={() => setView('staff')}
            style={{ ...navBtn, marginBottom: 16 }}
          >
            ← {t('staff.back_to_dashboard')}
          </button>
          {view === 'guest-home' && <GuestHome room="Staff" token={null} />}
          {view === 'guest-wifi' && <CompendiumPage onBack={() => setView('staff')} />}
          {view === 'guest-services' && (
            <>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>
                {t('staff.preview_note')}
              </p>
              <RequestForm room="Staff" token={null} onBack={() => setView('staff')} />
            </>
          )}
        </div>
      </BrandProvider>
    );
  }

  return (
    <HotelContext.Provider value={hotelContextValue}>
      <style>{neonTabsCss}</style>
      <div
        style={{
          ...brandStyles,
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          backgroundImage: hotel?.background_url
            ? `linear-gradient(rgba(15, 23, 42, 0.28), rgba(15, 23, 42, 0.28)), url(${hotel.background_url})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: 28,
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              padding: 18,
              borderRadius: 18,
              background: 'var(--brand-surface)',
              border: '1px solid rgba(148, 163, 184, 0.28)',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {hotel?.logo_url ? (
                <img
                  src={hotel.logo_url}
                  alt={hotel.name}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    objectFit: 'cover',
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
                  }}
                >
                  {hotel?.name?.slice(0, 1).toUpperCase() ?? 'R'}
                </div>
              )}
              <div>
                <h1 style={{ margin: 0, color: 'var(--brand-primary)' }}>{hotel?.name ?? t('staff.title')}</h1>
                <p style={{ margin: 0, color: '#1e293b' }}>{me.full_name ?? me.role} · {t('staff.logged_in_as')}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd', background: 'white' }}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
              <button onClick={() => signOut().then(() => window.location.reload())} style={{ ...smallBtn, background: 'white' }}>
                {t('staff.logout')}
              </button>
            </div>
          </header>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={navBtn}
              onClick={() => setView('guest-home')}
            >
              👤 {t('staff.view_guest')}
            </button>
            <button
              type="button"
              style={navBtn}
              onClick={() => setView('guest-wifi')}
            >
              📶 {t('staff.wifi')}
            </button>
            <button
              type="button"
              style={navBtn}
              onClick={() => setView('guest-services')}
            >
              🛎️ {t('staff.services')}
            </button>
          </div>

          <div className="tt22" style={{ marginTop: 24 }}>
            <nav className="tt22n" aria-label="Staff dashboard tabs">
              <input type="radio" name="tt22" id="tt22-r1" defaultChecked />
              <label className="tt22b" htmlFor="tt22-r1" style={tabAccentStyle}>{t('staff.tab_kitchen')}</label>

              <input type="radio" name="tt22" id="tt22-r2" />
              <label className="tt22b" htmlFor="tt22-r2" style={tabAccentStyle}>{t('staff.tab_service')}</label>

              <input type="radio" name="tt22" id="tt22-r3" />
              <label className="tt22b" htmlFor="tt22-r3" style={tabAccentStyle}>{t('staff.tab_register')}</label>

              <input type="radio" name="tt22" id="tt22-r4" />
              <label className="tt22b" htmlFor="tt22-r4" style={tabAccentStyle}>{t('staff.tab_menu')}</label>

              <input type="radio" name="tt22" id="tt22-r5" />
              <label className="tt22b" htmlFor="tt22-r5" style={tabAccentStyle}>{t('staff.tab_settings')}</label>
            </nav>

            <div className="tt22p">
              <div style={{ marginTop: 18 }}>
                <h2 style={{ color: 'var(--brand-primary)', marginBottom: 12 }}>{t('staff.tab_kitchen')}</h2>
                <div style={{ display: 'grid', gap: 16 }}>
                  {activeOrders.length === 0 && (
                    <div style={{ ...card, color: '#334155' }}>{t('staff.no_orders')}</div>
                  )}
                  {activeOrders.map((order) => (
                    <div key={order.id} style={{ ...card, flexDirection: 'column', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18 }}>
                        <span style={{ color: '#0f172a' }}>{t('staff.table')} {order.room_number}</span>
                        <span style={{ color: 'var(--brand-primary)' }}>#{order.id.slice(0, 6)}</span>
                      </div>

                      <div style={{ margin: '16px 0', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                        {order.order_items?.length ? (
                          order.order_items.map((item, i) => {
                            const menuItemData = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
                            const itemName = menuItemData?.name ?? 'Item desconocido';

                            return (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 15 }}>
                                <span>
                                  <strong style={{ display: 'inline-block', width: 24 }}>{item.quantity}x</strong>
                                  {itemName}
                                </span>
                                <span style={{ color: '#334155' }}>${(item.price_at_time * item.quantity).toFixed(2)}</span>
                              </div>
                            );
                          })
                        ) : (
                          <span style={{ color: '#999' }}>{t('staff.no_items_error')}</span>
                        )}
                        <div style={{ borderTop: '1px solid #ddd', marginTop: 12, paddingTop: 12, fontWeight: 700, textAlign: 'right' }}>
                          {t('staff.total')}: ${Number(order.total_price).toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#334155', fontSize: 14 }}>
                          {t('staff.status')}: <strong style={{ color: '#111827' }}>{statusText(order.status)}</strong>
                        </span>
                        <button onClick={() => advanceOrder(order)} style={actionBtn(order.status)}>
                          {order.status === 'new'
                            ? t('staff.start_prep')
                            : order.status === 'in_progress'
                              ? t('staff.mark_ready')
                              : t('staff.send_to_register')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="tt22p">
              <div style={{ marginTop: 18 }}>
                <h2 style={{ color: 'var(--brand-primary)', marginBottom: 12 }}>{t('staff.tab_service')}</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  {openRequests.length === 0 && (
                    <div style={{ ...card, color: '#334155' }}>{t('staff.no_requests')}</div>
                  )}
                  {openRequests.map((r) => (
                    <div key={r.id} style={card}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{t('staff.table')} {r.room_number}</div>
                        <div style={{ color: '#555', marginTop: 4 }}>{requestLabel(r.category)}</div>
                        {r.note && <div style={{ color: '#334155', marginTop: 4 }}>{r.note}</div>}
                      </div>
                      <button onClick={() => toggleRequestStatus(r)} style={actionBtn('ready')}>{t('staff.done')}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="tt22p">
              <div style={{ marginTop: 18 }}>
                <h2 style={{ color: 'var(--brand-primary)', marginBottom: 12 }}>{t('staff.tab_register')}</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  {paidOrders.length === 0 && (
                    <div style={{ ...card, color: '#334155' }}>{t('staff.no_paid_orders')}</div>
                  )}
                  {paidOrders.map((order) => (
                    <div key={order.id} style={card}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{t('staff.table')} {order.room_number}</div>
                        <div style={{ color: '#334155', marginTop: 4 }}>
                          {t('staff.total_to_charge')}: <strong>${Number(order.total_price).toFixed(2)}</strong>
                        </div>
                      </div>
                      <button onClick={() => markPaid(order)} style={actionBtn('paid')}>{t('staff.charge_paid')}</button>
                    </div>
                  ))}
                </div>

                <h3 style={{ marginTop: 32, color: '#334155' }}>{t('staff.completed_today')}</h3>
                <div style={{ display: 'grid', gap: 8, opacity: 0.6 }}>
                  {completedOrders.slice(0, 5).map((order) => (
                    <div key={order.id} style={{ ...card, padding: 12 }}>
                      <div style={{ flex: 1 }}>{t('staff.table')} {order.room_number} · ${Number(order.total_price).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="tt22p">
              <div style={{ marginTop: 18 }}>
                <MenuEditor hotel_id={me.hotel_id} />
              </div>
            </div>

            <div className="tt22p">
              <div
                style={{
                  marginTop: 18,
                  padding: 24,
                  borderRadius: 18,
                  background: 'var(--brand-surface)',
                  border: '1px solid rgba(148, 163, 184, 0.28)',
                  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <h2 style={{ color: 'var(--brand-primary)', marginBottom: 12 }}>{t('staff.customization')}</h2>

                <section style={{ marginBottom: 32 }}>
                  <h3 style={{ marginBottom: 8 }}>{t('staff.appearance_title')}</h3>
                  <p style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
                    {t('staff.appearance_desc')}
                  </p>
                  <BrandEditor
                    hotel_id={me.hotel_id}
                    onBrandUpdated={(updatedHotel) => {
                      setMe((prev) =>
                        prev
                          ? { ...prev, hotel: prev.hotel ? { ...prev.hotel, ...updatedHotel } : (updatedHotel as any) }
                          : prev,
                      );
                    }}
                  />
                </section>

                <section style={{ marginBottom: 32 }}>
                  <h3 style={{ marginBottom: 8 }}>{t('staff.wifi_title')}</h3>
                  <p style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
                    {t('staff.wifi_desc')}
                  </p>
                  <CompendiumEditor hotel_id={me.hotel_id} />
                </section>

                <section style={{ marginBottom: 32 }}>
                  <h3 style={{ marginBottom: 8 }}>{t('staff.recommendations_title')}</h3>
                  <p style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
                    {t('staff.recommendations_desc')}
                  </p>
                  <RecommendationsEditor hotel_id={me.hotel_id} />
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HotelContext.Provider>
  );
}

function getRequestLabel(category: string, t: (key: string) => string) {
  return t(`staff.req_${category}`) ?? category;
}

function getStatusText(status: string, t: (key: string) => string) {
  return t(`staff.status_${status}`) ?? status;
}

const card: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 16,
  border: '1px solid #eee',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.97)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
};

const smallBtn: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 13,
  background: 'white',
  border: '1px solid #ddd',
  borderRadius: 8,
  cursor: 'pointer',
};

const navBtn: React.CSSProperties = {
  padding: '10px 16px',
  background: 'white',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  color: '#334155',
};

function actionBtn(type: string): React.CSSProperties {
  const bg = type === 'ready' || type === 'in_progress' ? 'var(--brand-secondary)' : type === 'paid' ? '#0d9488' : 'var(--brand-primary)';

  return {
    padding: '12px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    color: 'white',
    background: bg,
  };
}
