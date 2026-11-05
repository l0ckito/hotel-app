import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
	
	try {
		const { hotel_id, room_number, items, t } = await req.json();
		if (!hotel_id || !room_number || !items || !items.length || !t) return json({ error: 'missing fields' }, 400);
		
		const secret = Deno.env.get('ROOM_TOKEN_SECRET');
		const message = `${hotel_id}:${room_number}`;
		const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
		const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
		const expected = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
		
		if (t !== expected) return json({ error: 'invalid token' }, 403);
		
		const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
		
		const menuItemIds = items.map((i: any) => i.menu_item_id);
		const { data: dbItems, error: menuErr } = await admin.from('menu_items').select('id, price').in('id', menuItemIds);
		if (menuErr || !dbItems) return json({ error: 'failed to verify menu' }, 500);
		
		let total_price = 0;
		const orderItemsToInsert = items.map((clientItem: any) => {
			const dbItem = dbItems.find((d) => d.id === clientItem.menu_item_id);
			if (!dbItem) throw new Error('Item not found');
			total_price += dbItem.price * clientItem.quantity;
			return { menu_item_id: dbItem.id, quantity: clientItem.quantity, price_at_time: dbItem.price };
		});
		
		const { data: order, error: orderErr } = await admin.from('orders').insert({ hotel_id, room_number, total_price, status: 'new' }).select('id').single();
		if (orderErr) return json({ error: orderErr.message }, 500);
		
		const itemsWithOrderId = orderItemsToInsert.map((i: any) => ({ ...i, order_id: order.id }));
		const { error: itemsErr } = await admin.from('order_items').insert(itemsWithOrderId);
		if (itemsErr) return json({ error: itemsErr.message }, 500);
		
		return json({ ok: true, order_id: order.id, total: total_price });
	} catch (e) {
		return json({ error: String(e) }, 500);
	}
});

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
