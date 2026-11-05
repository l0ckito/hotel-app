import { supabase } from '../lib/supabase';
import type { Hotel, TenantType } from './hotels';

export type { Hotel, TenantType } from './hotels';

export async function isAdmin(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase
    .from('platform_admins').select('user_id').eq('user_id', u.user.id).single();
  return !!data;
}

export async function listHotels(): Promise<Hotel[]> {
  const { data, error } = await supabase
    .from('hotels').select('*').order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((hotel) => ({
    ...hotel,
    tenant_type: (hotel.tenant_type as TenantType) ?? 'restaurant',
    feature_order_food: Boolean(hotel.feature_order_food),
    feature_wifi_info: Boolean(hotel.feature_wifi_info),
    feature_make_request: Boolean(hotel.feature_make_request),
    feature_explore_local: Boolean(hotel.feature_explore_local),
    request_categories: Array.isArray(hotel.request_categories) ? hotel.request_categories.filter((item: unknown): item is string => typeof item === 'string') : [],
  })) as Hotel[];
}

export async function createHotel(input: {
  name: string;
  subdomain: string;
  primary_color: string;
  secondary_color?: string | null;
  logo_url?: string | null;
  background_url?: string | null;
  tenant_type?: TenantType;
  feature_order_food?: boolean;
  feature_wifi_info?: boolean;
  feature_make_request?: boolean;
  feature_explore_local?: boolean;
  request_categories?: string[];
}) {
  const { data, error } = await supabase.from('hotels').insert(input).select().single();
  if (error) throw error;
  return data as Hotel;
}

export async function updateHotel(
  id: string,
  patch: Partial<Hotel>
) {
  const { data, error } = await supabase.from('hotels').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Hotel;
}

export async function deleteHotel(id: string) {
  const { error } = await supabase.from('hotels').delete().eq('id', id);
  if (error) throw error;
}

export async function generateRoomToken(hotel_id: string, room_number: string) {
  const { data, error } = await supabase.functions.invoke('generate-room-token', {
    body: { hotel_id, room_number },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? 'token generation failed');
  return data as { ok: true; hotel_id: string; room_number: string; t: string };
}

export async function inviteManager(email: string, hotel_id: string, full_name: string, password: string) {
  const { data, error } = await supabase.functions.invoke('invite-manager', {
    body: { email, hotel_id, full_name, password },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? 'Invite failed');
  return data;
}

export async function getPlatformStats() {
  const [hotelsRes, requestsRes] = await Promise.all([
    supabase.from('hotels').select('id', { count: 'exact' }),
    supabase.from('requests').select('id', { count: 'exact' }),
  ]);
  return {
    totalHotels: hotelsRes.count ?? 0,
    totalRequests: requestsRes.count ?? 0,
  };
}

