import { supabase } from '../lib/supabase';

export type CompendiumEntry = {
  id: string;
  hotel_id: string;
  section: string;
  content: string;
  sort_order: number;
};

export async function getCompendium(hotel_id: string): Promise<CompendiumEntry[]> {
  const { data, error } = await supabase
    .from('compendium')
    .select('*')
    .eq('hotel_id', hotel_id)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCompendiumEntry(input: {
  hotel_id: string;
  section: string;
  content: string;
  sort_order?: number;
}) {
  const { data, error } = await supabase
    .from('compendium')
    .insert({ ...input, sort_order: input.sort_order ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return data as CompendiumEntry;
}

export async function updateCompendiumEntry(
  id: string,
  patch: { section?: string; content?: string; sort_order?: number }
) {
  const { data, error } = await supabase
    .from('compendium')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as CompendiumEntry;
}

export async function deleteCompendiumEntry(id: string) {
  const { error } = await supabase.from('compendium').delete().eq('id', id);
  if (error) throw error;
}
