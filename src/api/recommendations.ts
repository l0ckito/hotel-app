import { supabase } from '../lib/supabase';

export type Recommendation = {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  category: 'food' | 'drink' | 'activity' | 'shopping' | 'other';
  walk_minutes: number | null;
  sort_order: number;
};

export async function getRecommendations(hotel_id: string): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from('local_recommendations')
    .select('*')
    .eq('hotel_id', hotel_id)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createRecommendation(input: {
  hotel_id: string;
  name: string;
  description?: string;
  category: Recommendation['category'];
  walk_minutes?: number;
  sort_order?: number;
}) {
  const { data, error } = await supabase.from('local_recommendations')
    .insert({ ...input, sort_order: input.sort_order ?? 0 })
    .select().single();
  if (error) throw error;
  return data as Recommendation;
}

export async function updateRecommendation(
  id: string,
  patch: Partial<Omit<Recommendation, 'id' | 'hotel_id'>>
) {
  const { data, error } = await supabase.from('local_recommendations')
    .update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Recommendation;
}

export async function deleteRecommendation(id: string) {
  const { error } = await supabase.from('local_recommendations').delete().eq('id', id);
  if (error) throw error;
}
