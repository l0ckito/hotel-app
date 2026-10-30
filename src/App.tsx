import { useState, useEffect } from 'react';
import { useTenant } from './hooks/useTenant';
import { BrandProvider } from './components/BrandProvider';
import GuestHome from './pages/guest/GuestHome';
import StaffLogin from './pages/staff/StaffLogin';
import StaffDashboard from './pages/staff/StaffDashboard';
import AdminPage from './pages/admin/AdminPage';
import { getMe } from './api/staff';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onNav = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);

  if (path.startsWith('/admin')) return <AdminPage />;
  if (path.startsWith('/staff')) return <StaffArea />;

  const { hotel, loading, error, room, token } = useTenant();
  if (loading) return <div style={{ padding: 40 }}>Loading hotel…</div>;
  if (error || !hotel)
    return <div style={{ padding: 40, color: 'red' }}>Error: {error ?? 'Hotel not found'}</div>;

  return (
    <BrandProvider hotel={hotel}>
      <GuestHome room={room} token={token} />
    </BrandProvider>
  );
}

function StaffArea() {
  const [me, setMe] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { getMe().then((m) => { setMe(m); setChecking(false); }); }, []);
  if (checking) return <div style={{ padding: 40 }}>Checking session…</div>;
  if (!me) return <StaffLogin onSignedIn={() => window.location.reload()} />;
  return <StaffDashboard />;
}
