import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const { hotel_id, room_number, category, note, t } = await req.json();
    if (!hotel_id || !room_number || !category || !t) return json({ error: 'missing fields' }, 400);
    
    const secret = Deno.env.get('ROOM_TOKEN_SECRET');
    const message = `${hotel_id}:${room_number}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
    const expected = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
    
    if (t !== expected) return json({ error: 'invalid token' }, 403);
    
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await admin.from('requests').insert({ hotel_id, room_number, category, note, status: 'new' }).select('id').single();
    
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, request_id: data.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
