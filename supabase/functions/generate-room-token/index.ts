import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // --- Verify caller is a platform admin ---
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'missing auth' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'invalid auth' }, 401);

    const uid = userData.user.id;
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: isAdmin } = await admin
      .from('platform_admins').select('user_id').eq('user_id', uid).single();
    if (!isAdmin) return json({ error: 'not an admin' }, 403);

    // --- Read input ---
    const { hotel_id, room_number } = await req.json();
    if (!hotel_id || !room_number) return json({ error: 'missing hotel_id or room_number' }, 400);

    // --- Confirm hotel exists ---
    const { data: hotel, error: hErr } = await admin
      .from('hotels').select('id, subdomain').eq('id', hotel_id).single();
    if (hErr || !hotel) return json({ error: 'hotel not found' }, 404);

    // --- Sign token ---
    const secret = Deno.env.get('ROOM_TOKEN_SECRET');
    if (!secret) return json({ error: 'server misconfigured' }, 500);

    const message = `${hotel_id}:${room_number}`;
    const t = await hmacHex(secret, message);

    return json({ ok: true, hotel_id, room_number, t });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}
