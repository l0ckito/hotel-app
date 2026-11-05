import { supabase } from '../lib/supabase';
import type { Hotel } from './hotels';

export type StaffMe = {
	id: string;
	hotel_id: string;
	role: 'staff' | 'manager';
	full_name: string | null;
	hotel: Hotel | null;
};

function normalizeHotel(row: Partial<Hotel> | null): Hotel | null {
	if (!row) return null;

	const requestCategories = Array.isArray(row.request_categories)
		? row.request_categories.filter((item): item is string => typeof item === 'string')
		: [];

	return {
		id: row.id ?? '',
		subdomain: row.subdomain ?? row.name?.toLowerCase().replace(/\s+/g, '-') ?? '',
		name: row.name ?? 'Restaurant',
		primary_color: row.primary_color ?? '#1f2937',
		secondary_color: row.secondary_color ?? null,
		logo_url: row.logo_url ?? null,
		background_url: row.background_url ?? null,
		tenant_type: (row.tenant_type as Hotel['tenant_type']) ?? 'restaurant',
		feature_order_food: Boolean(row.feature_order_food),
		feature_wifi_info: Boolean(row.feature_wifi_info),
		feature_make_request: Boolean(row.feature_make_request),
		feature_explore_local: Boolean(row.feature_explore_local),
		request_categories: requestCategories,
	};
}

export function normalizeAuthError(error: any): string {
	if (!error) return 'Authentication failed.';
	const status = Number(error?.status ?? error?.statusCode ?? 0);
	if (status === 429 || /too many requests|rate limit|rate_limit/i.test(String(error?.message ?? ''))) {
		return 'Too many sign-in attempts. Please wait a few minutes and try again.';
	}
	if (typeof error.message === 'string' && error.message.trim()) return error.message;
	return 'Authentication failed.';
}

export async function signIn(email: string, password: string) {
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) throw new Error(normalizeAuthError(error));
	return data;
}

export async function signOut() {
	await supabase.auth.signOut();
}

export async function getMe(): Promise<StaffMe | null> {
	const { data: userData } = await supabase.auth.getUser();
	const uid = userData.user?.id;
	if (!uid) return null;
	
	// 1. Staff row
	const { data: staffRow, error: staffErr } = await supabase
	.from('staff')
	.select('id, hotel_id, role, full_name')
	.eq('id', uid)
	.maybeSingle();
	
	if (staffErr) {
		console.error('getMe error (staff lookup):', staffErr);
		throw new Error(`Staff lookup failed: ${staffErr.message}`);
	}
	
	if (staffRow) {
		// 2. Hotel row (branding)
		const { data: hotelRow, error: hotelErr } = await supabase
		.from('hotels')
		.select('id, subdomain, name, primary_color, secondary_color, logo_url, background_url, tenant_type, feature_order_food, feature_wifi_info, feature_make_request, feature_explore_local, request_categories')
		.eq('id', staffRow.hotel_id)
		.maybeSingle();
		
		if (hotelErr) {
			console.error('getMe error (hotel lookup):', hotelErr);
		}
		
		return {
			...staffRow,
			hotel: normalizeHotel(hotelRow ?? null),
		};
	}
	
	// 3. Platform admin fallback (unchanged)
	const { data: adminRow, error: adminErr } = await supabase
	.from('platform_admins')
	.select('user_id')
	.eq('user_id', uid)
	.maybeSingle();
	
	if (adminErr) {
		console.error('getMe error (admin lookup):', adminErr);
	}
	
	if (adminRow) {
		const { data: firstHotel } = await supabase
		.from('hotels')
		.select('id, subdomain, name, primary_color, secondary_color, logo_url, background_url, tenant_type, feature_order_food, feature_wifi_info, feature_make_request, feature_explore_local, request_categories')
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();
		
		if (firstHotel) {
			return {
				id: uid,
				hotel_id: firstHotel.id,
				role: 'manager',
				full_name: 'Super Admin',
				hotel: normalizeHotel(firstHotel),
			};
		}
	}
	
	return null;
}
