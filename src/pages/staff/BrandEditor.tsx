import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { updateHotelBranding, type Hotel } from '../../api/hotels';

export default function BrandEditor({
  hotel_id,
  onBrandUpdated,
}: {
  hotel_id: string;
  onBrandUpdated?: (hotel: Partial<Hotel>) => void;
}) {
  const [primaryColor, setPrimaryColor] = useState('#800000');
  const [secondaryColor, setSecondaryColor] = useState('#d97706');
  const [logoUrl, setLogoUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    (async () => {
      const result = await supabase
        .from('hotels')
        .select('primary_color, secondary_color, logo_url, background_url')
        .eq('id', hotel_id)
        .single();

      if (ignore) return;

      const data = result.data;
      const loadError = result.error;

      if (loadError) {
        setError((loadError as any)?.message ?? 'No se pudo cargar la configuración del hotel.');
        return;
      }

      if (!data) return;

      setPrimaryColor(data.primary_color ?? '#800000');
      setSecondaryColor(data.secondary_color ?? '#d97706');
      setLogoUrl(data.logo_url ?? '');
      setBackgroundUrl(data.background_url ?? '');
    })();

    return () => {
      ignore = true;
    };
  }, [hotel_id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateHotelBranding(hotel_id, {
        primary_color: primaryColor,
        secondary_color: secondaryColor || null,
        logo_url: logoUrl.trim() || null,
        background_url: backgroundUrl.trim() || null,
      });

      onBrandUpdated?.(updated);
      setSuccess('Cambios guardados correctamente.');
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar la personalización.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={labelStyle}>
          <span>Color primario</span>
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          <span>Color secundario</span>
          <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <label style={labelStyle}>
        <span>Logo URL</span>
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://.../logo.png"
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        <span>Background URL</span>
        <input
          value={backgroundUrl}
          onChange={(e) => setBackgroundUrl(e.target.value)}
          placeholder="https://.../background.jpg"
          style={inputStyle}
        />
      </label>

      {error && <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p>}
      {success && <p style={{ margin: 0, color: '#166534' }}>{success}</p>}

      <button type="button" onClick={handleSave} disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'grid', gap: 8, fontSize: 13, fontWeight: 600, color: '#334155',
};

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff',
};

const btnStyle: React.CSSProperties = {
  padding: '10px 16px', border: 'none', borderRadius: 8, background: '#111827', color: '#fff', fontWeight: 600, cursor: 'pointer',
};
