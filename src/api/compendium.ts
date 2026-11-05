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
    .select();

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Insert returned no rows');

  return data[0] as CompendiumEntry;
}

export async function updateCompendiumEntry(
  id: string,
  patch: { section?: string; content?: string; sort_order?: number }
) {
  console.log('[compendium] update called with id:', id, 'patch:', patch);

  if (!id) {
    throw new Error('updateCompendiumEntry called without id');
  }

  const { data, error, status } = await supabase
    .from('compendium')
    .update(patch)
    .eq('id', id)
    .select();

  console.log('[compendium] update result:', { status, data, error });

  if (error) {
    console.error('[compendium] update error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Entry ${id} not found or update blocked. Check console for details.`
    );
  }

  return data[0] as CompendiumEntry;
}

export async function deleteCompendiumEntry(id: string) {
  const { error } = await supabase.from('compendium').delete().eq('id', id);
  if (error) throw error;
}
