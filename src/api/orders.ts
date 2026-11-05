import { supabase } from '../lib/supabase';

export type OrderStatus = 'new' | 'in_progress' | 'ready' | 'paid' | 'completed';

export type OrderLine = {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type Order = {
  id: string;
  hotel_id: string;
  room_number: string;
  status: OrderStatus;
  total_price: number;
  created_at: string;
};

export async function placeOrder(input: {
  hotel_id: string;
  room_number: string;
  items: Array<{ menu_item_id: string; quantity: number }>;
  t: string;
}) {
  const { data, error } = await supabase.functions.invoke('place-order', { body: input });

  if (error) {
    // The Supabase JS client wraps the actual function response in error.context.
    // We need to read that response to see the real error from the Edge Function.
    let realStatus: number | undefined;
    let realBody: string | null = null;
    let parsedBody: any = null;

    try {
      if (error.context && typeof error.context === 'object') {
        realStatus = (error.context as Response).status;
        if (typeof (error.context as Response).text === 'function') {
          realBody = await (error.context as Response).text();
          try {
            parsedBody = JSON.parse(realBody);
          } catch {
            parsedBody = null;
          }
        }
      }
    } catch (e) {
      console.error('Failed to read error context:', e);
    }

    console.error('=== PLACE ORDER FAILURE ===');
    console.error('HTTP Status:', realStatus);
    console.error('Raw body:', realBody);
    console.error('Parsed body:', parsedBody);
    console.error('Supabase error object:', error);
    console.error('===========================');

    // Throw a more useful error message so the guest UI shows it
    const message =
      parsedBody?.error ||
      parsedBody?.message ||
      realBody ||
      error.message ||
      'Order failed';

    throw new Error(`${message} (status ${realStatus ?? 'unknown'})`);
  }

  if (!data?.ok) {
    throw new Error(data?.error ?? 'Order failed');
  }

  return data;
}

export async function listOrders(hotel_id: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('hotel_id', hotel_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

export async function getOrderItems(orderId: string) {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('id', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
