import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import GuestLayout from '../../components/GuestLayout';
import { useHotel } from '../../hooks/useHotel';
import { getMenuItems, type MenuItem } from '../../api/menu';
import { placeOrder } from '../../api/orders';

const SLUGIFY = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export default function MenuPage({
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
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    getMenuItems(hotel.id)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [hotel.id]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();

    for (const item of items) {
      const category = (item.category ?? '').trim() || t('guest.other');
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(item);
    }

    return Array.from(map.entries());
  }, [items, t]);

  useEffect(() => {
    if (!grouped.length) {
      setActiveCategory(null);
      return;
    }

    setActiveCategory((prev) => prev ?? grouped[0][0]);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const category = visible.target.getAttribute('data-category');
          if (category) setActiveCategory(category);
        }
      },
      {
        root: null,
        threshold: [0.2, 0.5, 0.8],
        rootMargin: '-18% 0px -44% 0px',
      },
    );

    for (const [category] of grouped) {
      const element = document.getElementById(`cat-${SLUGIFY(category)}`);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [grouped]);

  const cartItems = useMemo(
    () =>
      items
        .filter((item) => cart[item.id])
        .map((item) => ({ ...item, quantity: cart[item.id] })),
    [items, cart],
  );

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function addToCart(item: MenuItem) {
    setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) => {
      const next = (prev[itemId] ?? 0) + delta;
      if (next <= 0) {
        const { [itemId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  }

  async function handlePlaceOrder() {
    if (!room || !token) {
      setError(t('guest.qr_required_desc'));
      return;
    }
    if (!cartItems.length) {
      setError(t('guest.cart_empty'));
      return;
    }

    setPlacing(true);
    setError(null);
    try {
      await placeOrder({
        hotel_id: hotel.id,
        room_number: room,
        items: cartItems.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          name: item.name,
          unit_price: item.price,
        })),
        t: token,
      });
      setCart({});
      setDone(true);
    } catch (e: any) {
      const msg = e?.message ?? 'No se pudo enviar tu pedido.';
      setError(msg);
      console.error('MenuPage order failure:', msg);
    } finally {
      setPlacing(false);
    }
  }

  if (done) {
    return (
      <GuestLayout>
        <div style={shell}>
          <button onClick={onBack} style={backBtn}>← {t('guest.back')}</button>
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 64 }}>✅</div>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: 8 }}>{t('guest.order_placed')}</h2>
            <p style={{ color: '#555' }}>{t('guest.table')} {room || '—'} · {hotel.name}</p>
            <button onClick={onBack} style={{ ...primaryBtn, marginTop: 16 }}>
              {t('guest.back_home')}
            </button>
          </div>
        </div>
      </GuestLayout>
    );
  }

  if (loading) {
    return (
      <GuestLayout>
        <div style={shell}>
          <button onClick={onBack} style={backBtn}>← {t('guest.back')}</button>
          <p>{t('guest.loading')}</p>
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      <div style={shell}>
        <button onClick={onBack} style={backBtn}>← {t('guest.back')}</button>
        <p style={{ marginTop: 12, marginBottom: 16, color: '#666' }}>{t('guest.table')} {room || t('guest.no_table_assigned')}</p>

        {grouped.length > 1 && (
          <div style={tabBar}>
            {grouped.map(([category]) => {
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    const element = document.getElementById(`cat-${SLUGIFY(category)}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  aria-pressed={isActive}
                  style={{
                    ...tabButton,
                    ...(isActive ? activeTabButton : {}),
                  }}
                >
                  {category}
                </button>
              );
            })}
          </div>
        )}

        {grouped.length === 0 ? (
          <div style={{ padding: '26px 0', color: '#666', textAlign: 'center', fontWeight: 600 }}>
            {t('guest.menu_coming_soon')}
          </div>
        ) : (
          grouped.map(([category, categoryItems]) => (
            <section
              key={category}
              id={`cat-${SLUGIFY(category)}`}
              data-category={category}
              style={{ scrollMarginTop: 110, marginTop: grouped.length > 1 ? 28 : 0 }}
            >
              <h2 style={sectionHeader}>{category}</h2>
              <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                {categoryItems.map((item) => (
                  <div key={item.id} style={card}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 17 }}>{item.name}</div>
                      {item.description && (
                        <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>{item.description}</div>
                      )}
                      <div style={{ color: 'var(--primary-color)', fontWeight: 700, marginTop: 8 }}>
                        ${Number(item.price).toFixed(2)}
                      </div>
                    </div>
                    <button type="button" onClick={() => addToCart(item)} style={smallBtn}>
                      + {t('guest.add')}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        <div style={cartBar}>
          <div>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('guest.cart')}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>${total.toFixed(2)}</div>
          </div>
          <button onClick={handlePlaceOrder} disabled={placing || cartItems.length === 0} style={{
            ...primaryBtn,
            opacity: placing || cartItems.length === 0 ? 0.7 : 1,
          }}>
            {placing ? t('guest.sending') : t('guest.place_order')}
          </button>
        </div>

        {error && (
          <p style={{ color: '#b91c1c', marginTop: 14, background: '#fef2f2', padding: 12, borderRadius: 8 }}>
            {error}
          </p>
        )}

        {cartItems.length > 0 && (
          <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
            {cartItems.map((item) => (
              <div key={item.id} style={{ ...card, background: '#fffaf2' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{item.quantity}x {item.name}</div>
                  <div style={{ color: '#666', fontSize: 13 }}>
                    ${Number(item.price).toFixed(2)} {t('guest.each')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => updateQuantity(item.id, -1)} style={qtyBtn}>−</button>
                  <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.id, 1)} style={qtyBtn}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GuestLayout>
  );
}

const shell: React.CSSProperties = {
  padding: 0,
  fontFamily: 'system-ui',
  paddingBottom: 120,
};

const backBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 15,
  cursor: 'pointer',
  padding: 0,
  color: '#555',
};

const tabBar: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  padding: '12px 0 10px',
  position: 'sticky',
  top: 0,
  zIndex: 15,
  background: 'var(--brand-surface, #fff)',
  backdropFilter: 'blur(8px)',
  margin: '0 -24px',
  paddingLeft: 24,
  paddingRight: 24,
  scrollbarWidth: 'none',
};

const tabButton: React.CSSProperties = {
  appearance: 'none',
  border: '1px solid rgba(128, 0, 0, 0.3)',
  background: '#fff',
  color: '#800000',
  padding: '8px 14px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
};

const activeTabButton: React.CSSProperties = {
  background: '#800000',
  color: '#fff',
  borderColor: '#800000',
  boxShadow: '0 6px 18px rgba(128, 0, 0, 0.18)',
};

const sectionHeader: React.CSSProperties = {
  position: 'sticky',
  top: 58,
  zIndex: 10,
  background: 'var(--brand-surface, #fff)',
  padding: '10px 0',
  margin: 0,
  color: '#800000',
  fontSize: 18,
  fontWeight: 800,
};

const card: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: 16,
  borderRadius: 14,
  border: '1px solid #eee',
  background: 'white',
};

const smallBtn: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: 'none',
  background: '#800000',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
};

const primaryBtn: React.CSSProperties = {
  padding: '14px 18px',
  borderRadius: 12,
  background: '#800000',
  border: 'none',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
};

const qtyBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid #ddd',
  background: 'white',
  fontWeight: 700,
  cursor: 'pointer',
};

const cartBar: React.CSSProperties = {
  position: 'sticky',
  bottom: 12,
  marginTop: 26,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '16px 18px',
  borderRadius: 16,
  border: '1px solid #f0d47a',
  background: 'linear-gradient(135deg, #fffaf0, #fff)',
  boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
};
