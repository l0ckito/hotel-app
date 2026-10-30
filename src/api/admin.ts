import { supabase } from '../lib/supabase';

export type Hotel = {
  id: string;
  subdomain: string;
  name: string;
  primary_color: string;
  logo_url: string | null;
};

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
  return data ?? [];
}

export async function createHotel(input: {
  name: string;
  subdomain: string;
  primary_color: string;
  logo_url?: string;
}) {
  const { data, error } = await supabase.from('hotels').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function generateRoomToken(hotel_id: string, room_number: string) {
  const { data, error } = await supabase.functions.invoke('generate-room-token', {
    body: { hotel_id, room_number },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? 'token generation failed');
  return data as { ok: true; hotel_id: string; room_number: string; t: string };
}

