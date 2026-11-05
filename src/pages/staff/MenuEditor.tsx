import { useCallback, useEffect, useState } from 'react';
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem, type MenuCategory, type MenuItem } from '../../api/menu';

export default function MenuEditor({ hotel_id }: { hotel_id: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getMenuItems(hotel_id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [hotel_id]);

  useEffect(() => { void reload(); }, [reload]);

  async function handleDelete(item: MenuItem) {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    try {
      await deleteMenuItem(item.id);
      reload();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Gestionar menú</h2>
        <button style={btn} onClick={() => setCreating(true)}>+ Agregar ítem</button>
      </div>
      <p style={{ color: '#666', fontSize: 13 }}>Los cambios se publican en la vista del cliente inmediato.</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Cargando…</p>}
      {!loading && items.length === 0 && <p style={{ color: '#999' }}>No hay ítems todavía.</p>}

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {items.map((item) => (
          <div key={item.id} style={row}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{item.name}</div>
              <div style={{ color: '#555', fontSize: 13 }}>{item.category}</div>
              {item.description && <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{item.description}</div>}
              <div style={{ color: '#800000', fontWeight: 700, marginTop: 4 }}>${Number(item.price).toFixed(2)}</div>
            </div>
            <button style={smallBtn} onClick={() => setEditing(item)}>Editar</button>
            <button style={{ ...smallBtn, color: '#b91c1c' }} onClick={() => handleDelete(item)}>Eliminar</button>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <ItemModal
          hotel_id={hotel_id}
          item={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); reload(); }}
        />
      )}
    </div>
  );
}

function ItemModal({
  hotel_id,
  item,
  onClose,
  onSaved,
}: {
  hotel_id: string;
  item: MenuItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item?.price ? String(item.price) : '0');
  const [category, setCategory] = useState<MenuCategory>(item?.category ?? 'Lunch Specials');
  const [available, setAvailable] = useState(item?.is_available ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        description: description.trim() || null,
        price: Number(price) || 0,
        category,
        is_available: available,
      };

      if (item) await updateMenuItem(item.id, payload);
      else await createMenuItem({ hotel_id, ...payload });
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{item ? 'Editar ítem' : 'Nuevo ítem'}</h3>

        <label style={label}>Nombre</label>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} />

        <label style={label}>Descripción</label>
        <textarea style={{ ...input, height: 90, fontFamily: 'inherit' }} value={description} onChange={(e) => setDescription(e.target.value)} />

        <label style={label}>Precio</label>
        <input style={input} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />

        <label style={label}>Categoría</label>
        <select style={input} value={category} onChange={(e) => setCategory(e.target.value as MenuCategory)}>
          <option value="Appetizers">Appetizers</option>
          <option value="Lunch Specials">Lunch Specials</option>
          <option value="Tacos & Classics">Tacos & Classics</option>
          <option value="From The Grill">From The Grill</option>
          <option value="Drinks">Drinks</option>
          <option value="Desserts & Soft Drinks">Desserts & Soft Drinks</option>
        </select>

        <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          Disponible
        </label>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button style={smallBtn} onClick={onClose}>Cancelar</button>
          <button style={btn} onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16,
  border: '1px solid #eee', borderRadius: 12, background: 'white',
};
const btn: React.CSSProperties = {
  padding: '10px 16px', fontSize: 14, fontWeight: 600, background: '#800000', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
};
const smallBtn: React.CSSProperties = {
  padding: '8px 12px', fontSize: 13, background: 'white', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer',
};
const input: React.CSSProperties = {
  width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
};
const label: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginTop: 12, marginBottom: 4,
};
const backdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100,
};
const modal: React.CSSProperties = {
  background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
};
