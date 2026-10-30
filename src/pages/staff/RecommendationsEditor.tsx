import { useEffect, useState } from 'react';
import {
	getRecommendations,
	createRecommendation,
	updateRecommendation,
	deleteRecommendation,
	type Recommendation,
} from '../../api/recommendations';

export default function RecommendationsEditor({ hotel_id }: { hotel_id: string }) {
	const [items, setItems] = useState<Recommendation[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<Recommendation | null>(null);
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	async function reload() {
		setLoading(true);
		try {
			setItems(await getRecommendations(hotel_id));
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}
	
	useEffect(() => { reload(); }, [hotel_id]);
	
	async function handleDelete(r: Recommendation) {
		if (!confirm(`Delete "${r.name}"?`)) return;
		try {
			await deleteRecommendation(r.id);
			reload();
		} catch (e: any) {
			setError(e.message);
		}
	}
	
	return (
		<div>
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
		<h2 style={{ margin: 0 }}>Local recommendations</h2>
		<button style={btn} onClick={() => setCreating(true)}>+ Add</button>
		</div>
		<p style={{ color: '#666', fontSize: 13 }}>
		These appear on the guest "Explore Local" page.
		</p>
		
		{error && <p style={{ color: 'red' }}>{error}</p>}
		{loading && <p>Loading…</p>}
		{!loading && items.length === 0 && (
			<p style={{ color: '#999' }}>None yet. Click "+ Add" to create your first.</p>
		)}
		
		<div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
		{items.map((r) => (
			<div key={r.id} style={row}>
			<div style={{ flex: 1 }}>
			<div style={{ fontSize: 12, color: '#0f4c81', fontWeight: 600, textTransform: 'uppercase' }}>
			{r.category}
			</div>
			<div style={{ fontWeight: 600 }}>{r.name}</div>
			{r.description && <div style={{ color: '#555', fontSize: 14 }}>{r.description}</div>}
			{r.walk_minutes != null && (
				<div style={{ color: '#999', fontSize: 12 }}>🚶 {r.walk_minutes} min</div>
			)}
			</div>
			<button style={smallBtn} onClick={() => setEditing(r)}>Edit</button>
			<button style={{ ...smallBtn, color: '#b91c1c' }} onClick={() => handleDelete(r)}>Delete</button>
			</div>
		))}
		</div>
		
		{(editing || creating) && (
			<RecommendationModal
			hotel_id={hotel_id}
			item={editing}
			onClose={() => { setEditing(null); setCreating(false); }}
			onSaved={() => { setEditing(null); setCreating(false); reload(); }}
			/>
		)}
		</div>
	);
}

function RecommendationModal({
	hotel_id,
	item,
	onClose,
	onSaved,
}: {
	hotel_id: string;
	item: Recommendation | null;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [name, setName] = useState(item?.name ?? '');
	const [description, setDescription] = useState(item?.description ?? '');
	const [category, setCategory] = useState<Recommendation['category']>(item?.category ?? 'food');
	const [walk, setWalk] = useState(item?.walk_minutes != null ? String(item.walk_minutes) : '');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	async function save() {
		setSaving(true);
		setError(null);
		try {
			const payload = {
				name,
				description,
				category,
				walk_minutes: walk ? Number(walk) : undefined,
			};
			if (item) await updateRecommendation(item.id, payload);
			else await createRecommendation({ hotel_id, ...payload });
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
		<h3 style={{ marginTop: 0 }}>{item ? 'Edit recommendation' : 'New recommendation'}</h3>
		
		<label style={label}>Name</label>
		<input style={input} value={name} onChange={(e) => setName(e.target.value)} />
		
		<label style={label}>Category</label>
		<select
		style={input}
		value={category}
		onChange={(e) => setCategory(e.target.value as Recommendation['category'])}
		>
		<option value="food">Food</option>
		<option value="drink">Drinks</option>
		<option value="activity">Activity</option>
		<option value="shopping">Shopping</option>
		<option value="other">Other</option>
		</select>
		
		<label style={label}>Description</label>
		<textarea
		style={{ ...input, height: 80, fontFamily: 'inherit' }}
		value={description}
		onChange={(e) => setDescription(e.target.value)}
		/>
		
		<label style={label}>Walk minutes (optional)</label>
		<input
		style={input}
		type="number"
		value={walk}
		onChange={(e) => setWalk(e.target.value)}
		placeholder="e.g. 5"
		/>
		
		{error && <p style={{ color: 'red' }}>{error}</p>}
		
		<div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
		<button style={smallBtn} onClick={onClose}>Cancel</button>
		<button style={btn} onClick={save} disabled={saving || !name.trim()}>
		{saving ? 'Saving…' : 'Save'}
		</button>
		</div>
		</div>
		</div>
	);
}

const row: React.CSSProperties = {
	display: 'flex',
	alignItems: 'flex-start',
	gap: 12,
	padding: 16,
	border: '1px solid #eee',
	borderRadius: 12,
	background: 'white',
};

const btn: React.CSSProperties = {
	padding: '10px 16px',
	fontSize: 14,
	fontWeight: 600,
	background: '#111',
	color: 'white',
	border: 'none',
	borderRadius: 8,
	cursor: 'pointer',
};

const smallBtn: React.CSSProperties = {
	padding: '8px 12px',
	fontSize: 13,
	background: 'white',
	border: '1px solid #ddd',
	borderRadius: 8,
	cursor: 'pointer',
};

const input: React.CSSProperties = {
	width: '100%',
	padding: 10,
	border: '1px solid #ddd',
	borderRadius: 8,
	fontSize: 14,
	boxSizing: 'border-box',
};

const label: React.CSSProperties = {
	display: 'block',
	fontSize: 12,
	fontWeight: 600,
	color: '#555',
	marginTop: 12,
	marginBottom: 4,
};

const backdrop: React.CSSProperties = {
	position: 'fixed',
	inset: 0,
	background: 'rgba(0,0,0,0.4)',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	padding: 16,
	zIndex: 100,
};

const modal: React.CSSProperties = {
	background: 'white',
	borderRadius: 12,
	padding: 24,
	width: '100%',
	maxWidth: 480,
	maxHeight: '90vh',
	overflowY: 'auto',
};
