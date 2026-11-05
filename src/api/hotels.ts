import { supabase } from '../lib/supabase';

export type TenantType = 'hotel' | 'restaurant' | 'both';

export type Hotel = {
  id: string;
  subdomain: string;
  name: string;
  logo_url: string | null;
  background_url?: string | null;
  primary_color: string;
  secondary_color?: string | null;
  tenant_type?: TenantType;
  feature_order_food?: boolean;
  feature_wifi_info?: boolean;
  feature_make_request?: boolean;
  feature_explore_local?: boolean;
  request_categories?: string[];
};

export type HotelBrandingUpdate = {
  logo_url?: string | null;
  background_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

function normalizeRequestCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function coerceFeatureFlag(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return Boolean(value);
}

export function buildRestaurantAssetPath(hotelId: string, kind: 'logo' | 'background', extension: string) {
  const normalizedExt = extension.toLowerCase();
  return `${hotelId}/${kind}.${normalizedExt}`;
}

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

  if (!data) return null;

  return {
    ...data,
    tenant_type: (data.tenant_type as TenantType) ?? 'restaurant',
    feature_order_food: coerceFeatureFlag(data.feature_order_food, true),
    feature_wifi_info: coerceFeatureFlag(data.feature_wifi_info, true),
    feature_make_request: coerceFeatureFlag(data.feature_make_request, true),
    feature_explore_local: coerceFeatureFlag(data.feature_explore_local, false),
    request_categories: normalizeRequestCategories(data.request_categories),
  } as Hotel;
}

export async function uploadRestaurantAsset(hotelId: string, kind: 'logo' | 'background', file: File) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = buildRestaurantAssetPath(hotelId, kind, ext);
  const { error } = await supabase.storage.from('restaurant-assets').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/png',
  });

  if (error) throw error;

  const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function updateHotelBranding(hotelId: string, updates: HotelBrandingUpdate) {
  const { data, error } = await supabase
    .from('hotels')
    .update(updates)
    .eq('id', hotelId)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    tenant_type: (data.tenant_type as TenantType) ?? 'restaurant',
    feature_order_food: coerceFeatureFlag(data.feature_order_food, true),
    feature_wifi_info: coerceFeatureFlag(data.feature_wifi_info, true),
    feature_make_request: coerceFeatureFlag(data.feature_make_request, true),
    feature_explore_local: coerceFeatureFlag(data.feature_explore_local, false),
    request_categories: normalizeRequestCategories(data.request_categories),
  } as Hotel;
}

export async function removeRestaurantAsset(hotelId: string, kind: 'logo' | 'background') {
  const path = buildRestaurantAssetPath(hotelId, kind, 'png');
  const altPath = buildRestaurantAssetPath(hotelId, kind, 'jpg');
  const altPath2 = buildRestaurantAssetPath(hotelId, kind, 'jpeg');
  const altPath3 = buildRestaurantAssetPath(hotelId, kind, 'svg');
  const altPath4 = buildRestaurantAssetPath(hotelId, kind, 'webp');

  const { error } = await supabase.storage.from('restaurant-assets').remove([
    path,
    altPath,
    altPath2,
    altPath3,
    altPath4,
  ]);

  if (error) throw error;
}

