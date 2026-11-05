import { useCallback, useEffect, useState } from 'react';
import {
  getCompendium, createCompendiumEntry, updateCompendiumEntry,
  deleteCompendiumEntry, type CompendiumEntry,
} from '../../api/compendium';

export default function CompendiumEditor({ hotel_id }: { hotel_id: string }) {
  const [entries, setEntries] = useState<CompendiumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CompendiumEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await getCompendium(hotel_id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [hotel_id]);

  useEffect(() => { void reload(); }, [reload]);

  async function handleDelete(e: CompendiumEntry) {
    if (!confirm(`Delete "${e.section}"?`)) return;
    try {
      await deleteCompendiumEntry(e.id);
      reload();
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Hotel info</h2>
        <button style={btn} onClick={() => setCreating(true)}>+ Add entry</button>
      </div>
      <p style={{ color: '#666', fontSize: 13 }}>
        These entries appear on the guest "Wi-Fi & Info" page. Order matters — top to bottom.
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading…</p>}
      {!loading && entries.length === 0 && <p style={{ color: '#999' }}>No entries yet. Add one to get started.</p>}

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {entries.map((e) => (
          <div key={e.id} style={row}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#0f4c81' }}>{e.section}</div>
              <div style={{ color: '#333', whiteSpace: 'pre-wrap', marginTop: 4 }}>{e.content}</div>
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>order {e.sort_order}</div>
            </div>
            <button style={smallBtn} onClick={() => setEditing(e)}>Edit</button>
            <button style={{ ...smallBtn, color: '#b91c1c' }} onClick={() => handleDelete(e)}>Delete</button>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <EntryModal
          hotel_id={hotel_id}
          entry={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); reload(); }}
        />
      )}
    </div>
  );
}

function EntryModal({
  hotel_id, entry, onClose, onSaved,
}: {
  hotel_id: string;
  entry: CompendiumEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [section, setSection] = useState(entry?.section ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [order, setOrder] = useState(String(entry?.sort_order ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setError(null);
    try {
      if (entry) {
        await updateCompendiumEntry(entry.id, {
          section, content, sort_order: Number(order) || 0,
        });
      } else {
        await createCompendiumEntry({
          hotel_id, section, content, sort_order: Number(order) || 0,
        });
      }
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
        <h3 style={{ marginTop: 0 }}>{entry ? 'Edit entry' : 'New entry'}</h3>
        <label style={label}>Section</label>
        <input style={input} value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Wi-Fi, Breakfast, Checkout" />
        <label style={label}>Content</label>
        <textarea style={{ ...input, height: 120, fontFamily: 'inherit' }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Network: GuestNet&#10;Password: welcome2024" />
        <label style={label}>Sort order (lower first)</label>
        <input style={input} type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button style={smallBtn} onClick={onClose}>Cancel</button>
          <button style={btn} onClick={save} disabled={saving || !section.trim() || !content.trim()}>
            {saving ? 'Saving…' : 'Save'}
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
  padding: '10px 16px', fontSize: 14, fontWeight: 600, background: '#111',
  color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
};
const smallBtn: React.CSSProperties = {
  padding: '8px 12px', fontSize: 13, background: 'white', border: '1px solid #ddd',
  borderRadius: 8, cursor: 'pointer',
};
const input: React.CSSProperties = {
  width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8,
  fontSize: 14, boxSizing: 'border-box',
};
const label: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginTop: 12, marginBottom: 4,
};
const backdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100,
};
const modal: React.CSSProperties = {
  background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480,
  maxHeight: '90vh', overflowY: 'auto',
};
