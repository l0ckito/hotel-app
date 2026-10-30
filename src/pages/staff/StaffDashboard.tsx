import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getMe, signOut, type StaffMe } from '../../api/staff';
import { listRequests, updateRequestStatus } from '../../api/requests';
import CompendiumEditor from './CompendiumEditor';
import RecommendationsEditor from './RecommendationsEditor';

type Req = {
  id: string;
  room_number: string;
  category: string;
  note: string | null;
  status: 'new' | 'in_progress' | 'done';
  created_at: string;
};

export default function StaffDashboard() {
  const [me, setMe] = useState<StaffMe | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'queue' | 'info' | 'explore'>('queue');
  
  // force a re-render every 30s so "Xm ago" labels stay fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  
  useEffect(() => {
    (async () => {
      const staff = await getMe();
      if (!staff) { setLoading(false); return; }
      setMe(staff);
      const initial = await listRequests(staff.hotel_id);
      setRequests(initial as Req[]);
      setLoading(false);
      
      const channel = supabase
      .channel(`requests-${staff.hotel_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `hotel_id=eq.${staff.hotel_id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRequests((prev) => [payload.new as Req, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRequests((prev) =>
            prev.map((r) => (r.id === (payload.new as Req).id ? (payload.new as Req) : r))
            );
          }
        }
      )
      .subscribe();
      
      return () => { supabase.removeChannel(channel); };
    })();
  }, []);
  
  async function toggleStatus(r: Req) {
    const next = r.status === 'new' ? 'in_progress' : 'done';
    await updateRequestStatus(r.id, next);
  }
  
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;
  if (!me) return <div style={{ padding: 40 }}>Not signed in.</div>;
  
  const open = requests.filter((r) => r.status !== 'done');
  const done = requests.filter((r) => r.status === 'done');
  
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
    <h1 style={{ margin: 0 }}>{me.hotel?.name}</h1>
    <p style={{ margin: 0, color: '#666' }}>
    {me.full_name ?? me.role} · signed in
    </p>
    </div>
    <button
    onClick={() => signOut().then(() => window.location.reload())}
    style={smallBtn}
    >
    Sign out
    </button>
    </div>
    
    <div style={{ display: 'flex', gap: 4, marginTop: 24, borderBottom: '1px solid #eee' }}>
    <TabBtn active={tab === 'queue'} onClick={() => setTab('queue')}>Request queue</TabBtn>
    <TabBtn active={tab === 'info'} onClick={() => setTab('info')}>Hotel info</TabBtn>
    <TabBtn active={tab === 'explore'} onClick={() => setTab('explore')}>Recommendations</TabBtn>
    </div>
    
    {tab === 'queue' && (
      <>
      <h2 style={{ marginTop: 32 }}>Open ({open.length})</h2>
      {open.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: 12, color: '#999' }}>
        <div style={{ fontSize: 36 }}>🟢</div>
        <p style={{ margin: '8px 0 0' }}>No open requests. Nice work.</p>
        <p style={{ margin: '4px 0 0', fontSize: 13 }}>New requests will appear here automatically.</p>
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
      {open.map((r) => {
        const u = urgency(r.created_at);
        return (
          <div key={r.id} style={card}>
          <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>
          Room {r.room_number} · {r.category}
          </div>
          {r.note && <div style={{ color: '#555', marginTop: 4 }}>{r.note}</div>}
          <div style={{ color: '#999', fontSize: 12, marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: u.color, fontWeight: 700 }}>{u.label} ago</span>
          <span>·</span>
          <span>{new Date(r.created_at).toLocaleTimeString()}</span>
          <span>·</span>
          <span>{r.status}</span>
          </div>
          </div>
          <button onClick={() => toggleStatus(r)} style={actionBtn(r.status)}>
          {r.status === 'new' ? 'Accept' : 'Complete'}
          </button>
          </div>
        );
      })}
      </div>
      
      <h2 style={{ marginTop: 32 }}>Done ({done.length})</h2>
      <div style={{ display: 'grid', gap: 8 }}>
      {done.slice(0, 5).map((r) => (
        <div key={r.id} style={{ ...card, opacity: 0.6 }}>
        <div>Room {r.room_number} · {r.category}</div>
        </div>
      ))}
      </div>
      </>
    )}
    
    {tab === 'info' && (
      <div style={{ marginTop: 32 }}>
      <CompendiumEditor hotel_id={me.hotel_id} />
      </div>
    )}
    
    {tab === 'explore' && (
      <div style={{ marginTop: 32 }}>
      <RecommendationsEditor hotel_id={me.hotel_id} />
      </div>
    )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
    onClick={onClick}
    style={{
      padding: '10px 14px',
      background: 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #0f4c81' : '2px solid transparent',
      color: active ? '#0f4c81' : '#666',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      marginBottom: -1,
    }}
    >
    {children}
    </button>
  );
}

function urgency(created_at: string): { label: string; color: string } {
  const minutes = (Date.now() - new Date(created_at).getTime()) / 60000;
  if (minutes > 10) return { label: `${Math.floor(minutes)}m`, color: '#b91c1c' };
  if (minutes > 5) return { label: `${Math.floor(minutes)}m`, color: '#d97706' };
  return { label: `${Math.max(1, Math.floor(minutes))}m`, color: '#059669' };
}

const card: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 16,
  border: '1px solid #eee',
  borderRadius: 12,
  background: 'white',
};

const smallBtn: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 13,
  background: 'white',
  border: '1px solid #ddd',
  borderRadius: 8,
  cursor: 'pointer',
};

function actionBtn(status: Req['status']): React.CSSProperties {
  return {
    padding: '12px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    color: 'white',
    background: status === 'new' ? '#0f4c81' : '#0d9488',
  };
}
