import { supabase } from '../lib/supabase';

export type RequestCategory = string;

export async function submitRequest(input: {
  hotel_id: string;
  room_number: string;
  category: RequestCategory;
  note?: string;
  t: string;
}): Promise<{ ok: true; request_id: string }> {
  const { data, error } = await supabase.functions.invoke('submit-request', {
    body: input,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? 'Request failed');
  return data;
}

export async function listRequests(hotel_id: string) {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('hotel_id', hotel_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateRequestStatus(
  id: string,
  status: 'new' | 'in_progress' | 'done',
) {
  const { error } = await supabase
    .from('requests')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}
