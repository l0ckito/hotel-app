import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHotel } from '../../hooks/useHotel';
import { getMenuItems, type MenuItem } from '../../api/menu';
import { placeOrder } from '../../api/orders';

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

  useEffect(() => {
    getMenuItems(hotel.id)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [hotel.id]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items],
  );

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
    );
  }

  if (loading) {
    return (
      <div style={shell}>
        <button onClick={onBack} style={backBtn}>← {t('guest.back')}</button>
        <p>{t('guest.loading')}</p>
      </div>
    );
  }

  return (
    <div style={shell}>
      <button onClick={onBack} style={backBtn}>← {t('guest.back')}</button>
      <h2 style={{ color: 'var(--primary-color)', marginBottom: 8 }}>{hotel.name}</h2>
      <p style={{ marginTop: 0, color: '#666' }}>{t('guest.table')} {room || t('guest.no_table_assigned')}</p>

      {categories.map((category) => (
        <div key={category} style={{ marginTop: 20 }}>
          <h3 style={{ margin: '0 0 12px', color: '#333' }}>{category}</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {items
              .filter((item) => item.category === category)
              .map((item) => (
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
                  <button onClick={() => addToCart(item)} style={smallBtn}>
                    + {t('guest.add')}
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}

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
                <button onClick={() => updateQuantity(item.id, -1)} style={qtyBtn}>−</button>
                <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} style={qtyBtn}>+</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const shell: React.CSSProperties = {
  padding: 24,
  fontFamily: 'system-ui',
  maxWidth: 540,
  margin: '0 auto',
  paddingBottom: 120,
};

const backBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', fontSize: 15, cursor: 'pointer', padding: 0, color: '#555',
};

const card: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 14, border: '1px solid #eee', background: 'white',
};

const smallBtn: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 10, border: 'none', background: '#800000', color: 'white', fontWeight: 700, cursor: 'pointer',
};

const primaryBtn: React.CSSProperties = {
  padding: '14px 18px', borderRadius: 12, background: '#800000', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer',
};

const qtyBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8, border: '1px solid #ddd', background: 'white', fontWeight: 700, cursor: 'pointer',
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
  background: 'linear-gradient(135deg, #fffaf0, #fff) ',
  boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
};
