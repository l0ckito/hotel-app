import { supabase } from '../lib/supabase';

export type StaffMe = {
	id: string;
	hotel_id: string;
	role: 'staff' | 'manager';
	full_name: string | null;
	hotel: { id: string; name: string; primary_color: string } | null;
};

export async function signIn(email: string, password: string) {
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) throw error;
	return data;
}

export async function signOut() {
	await supabase.auth.signOut();
}

export async function getMe(): Promise<StaffMe | null> {
	const { data: userData } = await supabase.auth.getUser();
	const uid = userData.user?.id;
	if (!uid) return null;
	
	const { data, error } = await supabase
	.from('staff')
	.select('id, hotel_id, role, full_name, hotel:hotels(id, name, primary_color)')
	.eq('id', uid)
	.single();
	
	if (error) {
		console.error('getMe', error);
		return null;
	}
	// Supabase returns a nested object (or array of one) depending on version
	const hotel = Array.isArray(data.hotel) ? data.hotel[0] : data.hotel;
	return { ...data, hotel } as StaffMe;
}
