import { supabase } from '../lib/supabase';

export type Hotel = {
  id: string;
  subdomain: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
};

export async function getHotelBySubdomain(subdomain: string): Promise<Hotel | null> {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('subdomain', subdomain)
    .single();

  if (error) {
    console.error('getHotelBySubdomain', error);
    return null;
  }
  return data;
}
