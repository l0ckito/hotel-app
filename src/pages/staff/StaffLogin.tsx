import { useState } from 'react';
import { signIn } from '../../api/staff';

export default function StaffLogin({ onSignedIn }: { onSignedIn: () => void }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	
	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			await signIn(email, password);
			onSignedIn();
		} catch (err: any) {
			setError(err.message ?? 'Sign-in failed');
		} finally {
			setLoading(false);
		}
	}
	
	return (
		<form onSubmit={handleSubmit} style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 400, margin: '40px auto' }}>
		<h1>Staff sign-in</h1>
		<input
		type="email"
		placeholder="Email"
		value={email}
		onChange={(e) => setEmail(e.target.value)}
		required
		style={input}
		/>
		<input
		type="password"
		placeholder="Password"
		value={password}
		onChange={(e) => setPassword(e.target.value)}
		required
		style={input}
		/>
		{error && <p style={{ color: 'red' }}>{error}</p>}
		<button type="submit" disabled={loading} style={btn}>
		{loading ? 'Signing in…' : 'Sign in'}
		</button>
		</form>
	);
}

const input: React.CSSProperties = {
	width: '100%', padding: 12, marginBottom: 12,
	border: '1px solid #ddd', borderRadius: 8, fontSize: 15,
};
const btn: React.CSSProperties = {
	width: '100%', padding: 14, fontSize: 16, fontWeight: 600,
	background: '#111', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
};
