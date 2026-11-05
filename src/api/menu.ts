import { supabase } from '../lib/supabase';

export type MenuCategory =
  | 'Appetizers'
  | 'Lunch Specials'
  | 'Tacos & Classics'
  | 'From The Grill'
  | 'Drinks'
  | 'Desserts & Soft Drinks';

export type MenuItem = {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  price: number;
  category: MenuCategory;
  is_available: boolean;
};

export async function getMenuItems(hotel_id: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('hotel_id', hotel_id)
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createMenuItem(input: Omit<MenuItem, 'id' | 'hotel_id'> & { hotel_id: string }) {
  const { data, error } = await supabase.from('menu_items').insert(input).select().single();
  if (error) throw error;
  return data as MenuItem;
}

export async function updateMenuItem(id: string, patch: Partial<Omit<MenuItem, 'id' | 'hotel_id'>>) {
  const { data, error } = await supabase.from('menu_items').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as MenuItem;
}

export async function deleteMenuItem(id: string) {
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) throw error;
}
